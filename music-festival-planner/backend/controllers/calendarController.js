const mongoose = require('mongoose');

const AppError = require('../middleware/AppError');
const Performance = require('../models/performance');
const GoogleCalendarToken = require('../models/googleCalendarToken');
const {
  createCalendarClient,
  createGoogleOAuthClient,
  getConfiguredScopes,
  isGoogleOAuthConfigured,
} = require('../config/googleOAuth');
const { createSignedCalendarState, verifySignedCalendarState } = require('../utils/calendarState');
const {
  authCalendarQuerySchema,
  calendarCallbackQuerySchema,
} = require('../validators/calendarSchemas');

// Use this URL when no custom frontend URL has been set in the environment.
const DEFAULT_FRONTEND_URL = 'http://localhost:4200/#/my-schedule';

// Turn a raw comma-separated string of IDs into a clean, deduplicated list of valid MongoDB IDs.
function parsePerformanceIds(rawPerformanceIds) {
  // Split by comma, trim whitespace from each piece, remove any that aren't valid MongoDB IDs, and deduplicate.
  return [...new Set(String(rawPerformanceIds || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => mongoose.isValidObjectId(id)))];
}

// Look up a frontend URL from the environment, falling back to the default if nothing is set.
function getFrontendUrl(key) {
  // Read the environment variable for this URL key.
  const value = process.env[key];
  // Return the environment value if it contains something useful, otherwise use the built-in default.
  if (value && String(value).trim()) {
    return value;
  }
  return DEFAULT_FRONTEND_URL;
}

// Attach a set of key-value pairs as query parameters onto a base URL string.
function buildRedirectUrl(baseUrl, params) {
  // Wrap in try/catch in case the base URL is somehow malformed.
  try {
    // Parse the base URL so we can safely append parameters to it.
    const url = new URL(baseUrl);
    // Add each parameter, skipping any that are empty or undefined.
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
    // Return the fully assembled URL as a plain string.
    return url.toString();
  } catch {
    // If parsing failed, return the original base URL unchanged.
    return baseUrl;
  }
}

// Build the URL the browser should land on after events are successfully exported.
function buildSuccessRedirectUrl(summary) {
  // Grab the configured success page URL from the environment.
  const successUrl = getFrontendUrl('CALENDAR_FRONTEND_SUCCESS_URL');
  // Attach the export statistics so the frontend can display them to the user.
  return buildRedirectUrl(successUrl, {
    calendarStatus: 'success',
    created: summary.created,
    skipped: summary.skipped,
    failed: summary.failed,
    total: summary.total,
    failureDetails: summary.failures.length > 0 ? JSON.stringify(summary.failures) : '',
  });
}

// Build the URL the browser should land on when something goes wrong during export.
function buildErrorRedirectUrl(message) {
  // Grab the configured error page URL from the environment.
  const errorUrl = getFrontendUrl('CALENDAR_FRONTEND_ERROR_URL');
  // Attach the error message so the frontend can explain what happened to the user.
  return buildRedirectUrl(errorUrl, {
    calendarStatus: 'error',
    calendarMessage: message,
  });
}

// Standardise a piece of text so it can be compared without worrying about case or extra spaces.
function normalizeSummary(value) {
  // Coerce to a string, strip leading/trailing whitespace, collapse internal spaces, and lowercase everything.
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Convert a date value into the specific string format Google Calendar expects.
function toGoogleDateTimeString(dateValue) {
  // Parse whatever we received into a proper Date object.
  const dateObj = new Date(dateValue);
  // If the date couldn't be parsed, signal failure by returning null.
  if (Number.isNaN(dateObj.getTime())) {
    return null;
  }

  // Pull each part of the date out of the UTC representation.
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const hour = String(dateObj.getUTCHours()).padStart(2, '0');
  const minute = String(dateObj.getUTCMinutes()).padStart(2, '0');

  // Assemble the parts into the YYYY-MM-DDTHH:MM:00 format Google Calendar requires.
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

// Compose a human-readable location string for a calendar event from the performance's linked data.
function buildLocation(performance) {
  // Gather the stage name, festival name, and festival city, defaulting gracefully when any is missing.
  const stageName = performance.stage?.name || 'Unknown Stage';
  const festivalName = performance.festival?.name || '';
  const festivalLocation = performance.festival?.location || '';
  // Join the non-empty pieces together with a dash separator.
  return [stageName, festivalName, festivalLocation].filter(Boolean).join(' - ');
}

// Compose the body text for a calendar event that summarises the performance details.
function buildDescription(performance) {
  // Start with the core fields that are always present.
  const lines = [
    `Festival: ${performance.festival?.name || 'Unknown'}`,
    `Stage: ${performance.stage?.name || 'Unknown'}`,
    `Artist: ${performance.artist?.name || 'Unknown'}`,
    `Performance ID: ${performance._id.toString()}`,
  ];
  // Only include the genre line if the performance has one.
  if (performance.genre) {
    lines.push(`Genre: ${performance.genre}`);
  }
  // Combine all lines into a single block of text.
  return lines.join('\n');
}

// Pull the start or end time out of a Google Calendar event object as a millisecond timestamp.
function parseEventDateTimeMs(eventDate) {
  // If the event date object or its dateTime field is missing, there's nothing to parse.
  if (!eventDate || !eventDate.dateTime) {
    return null;
  }
  // Parse the ISO string into a Date object.
  const parsed = new Date(eventDate.dateTime);
  // Return null if the string turned out to be invalid.
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  // Return the time as a plain number so it's easy to compare.
  return parsed.getTime();
}

// Extract a readable error message from an error object, or use a provided fallback.
function toErrorMessage(error, fallbackMessage) {
  // If there's no error at all, use the fallback.
  if (!error) return fallbackMessage;
  // Prefer the error's own message if it contains real text.
  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  // Fall back to the caller-supplied default when the error message is blank.
  return fallbackMessage;
}

// Check Google Calendar to see whether an event for this performance already exists.
async function findExistingEvent(calendarClient, performance, deviceUserId, eventSummary) {
  // Convert the performance ID to a string so it can be used in queries.
  const performanceId = performance._id.toString();
  // Parse the performance's start and end times for use in a date-range search.
  const startDate = new Date(performance.startDateTime);
  const endDate = new Date(performance.endDateTime);

  // First try to find the event using our custom private metadata tags for an exact match.
  const primarySearch = await calendarClient.events.list({
    calendarId: 'primary',
    singleEvents: true,
    maxResults: 1,
    privateExtendedProperty: [
      `mfpPerformanceId=${performanceId}`,
      `mfpDeviceUserId=${deviceUserId}`,
    ],
  });

  // If the metadata search found something, we're done — return it immediately.
  const primaryMatch = primarySearch.data.items?.[0];
  if (primaryMatch) {
    return primaryMatch;
  }

  // Fall back to a time-window search in case the event was created without our metadata tags.
  const fallbackSearch = await calendarClient.events.list({
    calendarId: 'primary',
    singleEvents: true,
    maxResults: 25,
    // Widen the window slightly to account for minor clock differences.
    timeMin: new Date(startDate.getTime() - 5 * 60 * 1000).toISOString(),
    timeMax: new Date(endDate.getTime() + 5 * 60 * 1000).toISOString(),
  });

  // Normalise the expected event title so the comparison isn't thrown off by casing or spaces.
  const normalizedSummary = normalizeSummary(eventSummary);
  // Pre-compute the expected start and end times as numbers for quick comparison.
  const startTimeMs = startDate.getTime();
  const endTimeMs = endDate.getTime();

  // Look through the nearby events for one whose title and exact time slot match what we'd create.
  return (
    fallbackSearch.data.items?.find((item) => {
      // Parse this candidate event's start and end times.
      const itemStartMs = parseEventDateTimeMs(item.start);
      const itemEndMs = parseEventDateTimeMs(item.end);
      // Skip events with unparseable times — we can't safely compare them.
      if (itemStartMs === null || itemEndMs === null) {
        return false;
      }

      // Treat it as a match only if the title and both timestamps line up exactly.
      return (
        normalizeSummary(item.summary) === normalizedSummary &&
        itemStartMs === startTimeMs &&
        itemEndMs === endTimeMs
      );
    }) || null
  );
}

// Assemble the full event object that will be sent to the Google Calendar API.
function buildEventPayload(performance, timezone, deviceUserId) {
  // Convert the performance ID to a string for use as a metadata tag.
  const performanceId = performance._id.toString();
  // Use the artist's name as the event title, with a safe fallback.
  const summary = performance.artist?.name || 'Festival Performance';

  // Return the complete event object in the shape Google Calendar expects.
  return {
    summary,
    location: buildLocation(performance),
    description: buildDescription(performance),
    start: {
      dateTime: toGoogleDateTimeString(performance.startDateTime),
      timeZone: timezone,
    },
    end: {
      dateTime: toGoogleDateTimeString(performance.endDateTime),
      timeZone: timezone,
    },
    // Store our own identifiers in private metadata so we can detect duplicates later.
    extendedProperties: {
      private: {
        mfpPerformanceId: performanceId,
        mfpDeviceUserId: deviceUserId,
      },
    },
  };
}

exports.startCalendarAuth = async (req, res, next) => {
  // Validate the incoming query parameters against the expected schema.
  const { error, value } = authCalendarQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  // If any query parameters are invalid, collect the details and reject the request.
  if (error) {
    const details = error.details.map((detail) => detail.message).join(' ');
    return next(new AppError(`Invalid calendar auth request. ${details}`, 400));
  }

  // If Google OAuth hasn't been set up on this server, we can't proceed.
  if (!isGoogleOAuthConfigured()) {
    return next(new AppError('Google OAuth is not configured on the server.', 500));
  }

  // Clean and deduplicate the list of performance IDs from the query string.
  const performanceIds = parsePerformanceIds(value.performanceIds);
  // Refuse the request if no valid performance IDs were provided.
  if (performanceIds.length === 0) {
    return next(new AppError('At least one valid performance ID is required.', 400));
  }

  // Wrap the OAuth redirect in a try block so errors bubble up cleanly.
  try {
    // Pack the performance IDs and user info into a tamper-proof signed state token.
    const state = createSignedCalendarState({
      performanceIds,
      deviceUserId: value.deviceUserId,
      timezone: value.timezone,
    });

    // Create a Google OAuth client and generate the URL the user needs to visit to grant access.
    const oauthClient = createGoogleOAuthClient();
    const authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: getConfiguredScopes(),
      // Embed the signed state so we can verify it when Google sends the user back.
      state,
    });

    // Send the user to Google's consent screen.
    return res.redirect(authUrl);
  } catch (err) {
    // Pass unexpected errors to the global error handler.
    return next(err);
  }
};

exports.handleCalendarCallback = async (req, res) => {
  // Validate the query parameters Google sent back with the callback.
  const { error, value } = calendarCallbackQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  // If the callback parameters are malformed, redirect the user to the error page.
  if (error) {
    const details = error.details.map((detail) => detail.message).join(' ');
    return res.redirect(buildErrorRedirectUrl(`Invalid callback parameters. ${details}`));
  }

  // If Google OAuth is not configured, we cannot exchange the code for tokens.
  if (!isGoogleOAuthConfigured()) {
    return res.redirect(buildErrorRedirectUrl('Google OAuth is not configured on the server.'));
  }

  // Wrap the entire callback flow in a try block so any failure redirects gracefully.
  try {
    // Verify and decode the state token to recover the original request details.
    const state = verifySignedCalendarState(value.state);
    // Grab the list of performance IDs the user originally wanted to export.
    const requestedPerformanceIds = state.performanceIds;

    // Create an OAuth client and exchange the one-time code for access and refresh tokens.
    const oauthClient = createGoogleOAuthClient();
    const tokenResponse = await oauthClient.getToken(value.code);
    const tokens = tokenResponse.tokens || {};

    // Check whether we already have a stored token record for this device user.
    const existingToken = await GoogleCalendarToken.findOne({ deviceUserId: state.deviceUserId });
    // Prefer the newly issued refresh token, but fall back to whatever we already had stored.
    const refreshToken = tokens.refresh_token || existingToken?.refreshToken || '';

    // Save the new token data, creating a record if one doesn't already exist.
    const tokenRecord = await GoogleCalendarToken.findOneAndUpdate(
      { deviceUserId: state.deviceUserId },
      {
        $set: {
          accessToken: tokens.access_token || '',
          refreshToken,
          scope: tokens.scope || '',
          tokenType: tokens.token_type || '',
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          calendarId: 'primary',
          lastAuthorizedAt: new Date(),
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Load the stored credentials into the OAuth client so it can make authenticated API calls.
    oauthClient.setCredentials({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      scope: tokenRecord.scope,
      token_type: tokenRecord.tokenType,
      expiry_date: tokenRecord.expiryDate ? tokenRecord.expiryDate.getTime() : undefined,
    });

    // Load all the requested performances from the database, including their related artist, stage, and festival details.
    const performances = await Performance.find({
      _id: { $in: requestedPerformanceIds },
    })
      .populate('artist', 'name genre')
      .populate('stage', 'name')
      .populate('festival', 'name location')
      .sort({ startDateTime: 1 });

    // Build a set of the IDs we actually found so we can spot any that are missing.
    const foundIds = new Set(performances.map((performance) => performance._id.toString()));
    // Work out which requested IDs had no matching database record.
    const missingPerformanceIds = requestedPerformanceIds.filter((id) => !foundIds.has(id));

    // Set up a counter object to track how many events we create, skip, or fail on.
    const summary = {
      total: requestedPerformanceIds.length,
      created: 0,
      skipped: 0,
      failed: 0,
      failures: [],
    };

    // Record each missing performance as a failure before we even try to export anything.
    for (const missingId of missingPerformanceIds) {
      summary.failed += 1;
      summary.failures.push({
        performanceId: missingId,
        reason: 'Performance not found.',
      });
    }

    // Create a Google Calendar API client ready to make requests on behalf of the user.
    const calendarClient = createCalendarClient(oauthClient);

    // Go through each found performance and try to add it to the user's Google Calendar.
    for (const performance of performances) {
      // Convert the performance ID to a string once so we reuse it throughout this iteration.
      const performanceId = performance._id.toString();

      // Wrap each event creation in its own try block so one failure doesn't abort the rest.
      try {
        // Build the event data payload for this performance.
        const eventPayload = buildEventPayload(performance, state.timezone, state.deviceUserId);
        // If the date/time conversion failed, throw an error rather than sending bad data to Google.
        if (!eventPayload.start.dateTime || !eventPayload.end.dateTime) {
          throw new Error('Performance date/time is invalid.');
        }

        // Check whether this event already exists in the user's calendar so we don't create a duplicate.
        const existingEvent = await findExistingEvent(
          calendarClient,
          performance,
          state.deviceUserId,
          eventPayload.summary
        );

        // If a matching event is already there, count it as skipped and move on.
        if (existingEvent) {
          summary.skipped += 1;
          continue;
        }

        // Create the new calendar event via the Google Calendar API.
        await calendarClient.events.insert({
          calendarId: 'primary',
          requestBody: eventPayload,
        });

        // Record that we successfully created this event.
        summary.created += 1;
      } catch (eventError) {
        // If anything went wrong for this performance, log the failure and continue with the others.
        summary.failed += 1;
        summary.failures.push({
          performanceId,
          reason: toErrorMessage(eventError, 'Failed to export performance.'),
        });
      }
    }

    // Mark the token as recently used now that we've finished making API calls.
    tokenRecord.lastUsedAt = new Date();
    await tokenRecord.save();

    // Redirect the user to the success page with a summary of what was exported.
    return res.redirect(buildSuccessRedirectUrl(summary));
  } catch (err) {
    // If anything in the overall flow failed, redirect the user to the error page with a message.
    return res.redirect(buildErrorRedirectUrl(toErrorMessage(err, 'Calendar export failed.')));
  }
};
