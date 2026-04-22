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

const DEFAULT_FRONTEND_URL = 'http://localhost:4200/#/my-schedule';

function parsePerformanceIds(rawPerformanceIds) {
  return [...new Set(String(rawPerformanceIds || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => mongoose.isValidObjectId(id)))];
}

function getFrontendUrl(key) {
  const value = process.env[key];
  if (value && String(value).trim()) {
    return value;
  }
  return DEFAULT_FRONTEND_URL;
}

function buildRedirectUrl(baseUrl, params) {
  try {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function buildSuccessRedirectUrl(summary) {
  const successUrl = getFrontendUrl('CALENDAR_FRONTEND_SUCCESS_URL');
  return buildRedirectUrl(successUrl, {
    calendarStatus: 'success',
    created: summary.created,
    skipped: summary.skipped,
    failed: summary.failed,
    total: summary.total,
    failureDetails: summary.failures.length > 0 ? JSON.stringify(summary.failures) : '',
  });
}

function buildErrorRedirectUrl(message) {
  const errorUrl = getFrontendUrl('CALENDAR_FRONTEND_ERROR_URL');
  return buildRedirectUrl(errorUrl, {
    calendarStatus: 'error',
    calendarMessage: message,
  });
}

function normalizeSummary(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function toGoogleDateTimeString(dateValue) {
  const dateObj = new Date(dateValue);
  if (Number.isNaN(dateObj.getTime())) {
    return null;
  }

  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const hour = String(dateObj.getUTCHours()).padStart(2, '0');
  const minute = String(dateObj.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

function buildLocation(performance) {
  const stageName = performance.stage?.name || 'Unknown Stage';
  const festivalName = performance.festival?.name || '';
  const festivalLocation = performance.festival?.location || '';
  return [stageName, festivalName, festivalLocation].filter(Boolean).join(' - ');
}

function buildDescription(performance) {
  const lines = [
    `Festival: ${performance.festival?.name || 'Unknown'}`,
    `Stage: ${performance.stage?.name || 'Unknown'}`,
    `Artist: ${performance.artist?.name || 'Unknown'}`,
    `Performance ID: ${performance._id.toString()}`,
  ];
  if (performance.genre) {
    lines.push(`Genre: ${performance.genre}`);
  }
  return lines.join('\n');
}

function parseEventDateTimeMs(eventDate) {
  if (!eventDate || !eventDate.dateTime) {
    return null;
  }
  const parsed = new Date(eventDate.dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
}

function toErrorMessage(error, fallbackMessage) {
  if (!error) return fallbackMessage;
  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallbackMessage;
}

async function findExistingEvent(calendarClient, performance, deviceUserId, eventSummary) {
  const performanceId = performance._id.toString();
  const startDate = new Date(performance.startDateTime);
  const endDate = new Date(performance.endDateTime);

  const primarySearch = await calendarClient.events.list({
    calendarId: 'primary',
    singleEvents: true,
    maxResults: 1,
    privateExtendedProperty: [
      `mfpPerformanceId=${performanceId}`,
      `mfpDeviceUserId=${deviceUserId}`,
    ],
  });

  const primaryMatch = primarySearch.data.items?.[0];
  if (primaryMatch) {
    return primaryMatch;
  }

  const fallbackSearch = await calendarClient.events.list({
    calendarId: 'primary',
    singleEvents: true,
    maxResults: 25,
    timeMin: new Date(startDate.getTime() - 5 * 60 * 1000).toISOString(),
    timeMax: new Date(endDate.getTime() + 5 * 60 * 1000).toISOString(),
  });

  const normalizedSummary = normalizeSummary(eventSummary);
  const startTimeMs = startDate.getTime();
  const endTimeMs = endDate.getTime();

  return (
    fallbackSearch.data.items?.find((item) => {
      const itemStartMs = parseEventDateTimeMs(item.start);
      const itemEndMs = parseEventDateTimeMs(item.end);
      if (itemStartMs === null || itemEndMs === null) {
        return false;
      }

      return (
        normalizeSummary(item.summary) === normalizedSummary &&
        itemStartMs === startTimeMs &&
        itemEndMs === endTimeMs
      );
    }) || null
  );
}

function buildEventPayload(performance, timezone, deviceUserId) {
  const performanceId = performance._id.toString();
  const summary = performance.artist?.name || 'Festival Performance';

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
    extendedProperties: {
      private: {
        mfpPerformanceId: performanceId,
        mfpDeviceUserId: deviceUserId,
      },
    },
  };
}

exports.startCalendarAuth = async (req, res, next) => {
  const { error, value } = authCalendarQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => detail.message).join(' ');
    return next(new AppError(`Invalid calendar auth request. ${details}`, 400));
  }

  if (!isGoogleOAuthConfigured()) {
    return next(new AppError('Google OAuth is not configured on the server.', 500));
  }

  const performanceIds = parsePerformanceIds(value.performanceIds);
  if (performanceIds.length === 0) {
    return next(new AppError('At least one valid performance ID is required.', 400));
  }

  try {
    const state = createSignedCalendarState({
      performanceIds,
      deviceUserId: value.deviceUserId,
      timezone: value.timezone,
    });

    const oauthClient = createGoogleOAuthClient();
    const authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: getConfiguredScopes(),
      state,
    });

    return res.redirect(authUrl);
  } catch (err) {
    return next(err);
  }
};

exports.handleCalendarCallback = async (req, res) => {
  const { error, value } = calendarCallbackQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => detail.message).join(' ');
    return res.redirect(buildErrorRedirectUrl(`Invalid callback parameters. ${details}`));
  }

  if (!isGoogleOAuthConfigured()) {
    return res.redirect(buildErrorRedirectUrl('Google OAuth is not configured on the server.'));
  }

  try {
    const state = verifySignedCalendarState(value.state);
    const requestedPerformanceIds = state.performanceIds;

    const oauthClient = createGoogleOAuthClient();
    const tokenResponse = await oauthClient.getToken(value.code);
    const tokens = tokenResponse.tokens || {};

    const existingToken = await GoogleCalendarToken.findOne({ deviceUserId: state.deviceUserId });
    const refreshToken = tokens.refresh_token || existingToken?.refreshToken || '';

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

    oauthClient.setCredentials({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      scope: tokenRecord.scope,
      token_type: tokenRecord.tokenType,
      expiry_date: tokenRecord.expiryDate ? tokenRecord.expiryDate.getTime() : undefined,
    });

    const performances = await Performance.find({
      _id: { $in: requestedPerformanceIds },
    })
      .populate('artist', 'name genre')
      .populate('stage', 'name')
      .populate('festival', 'name location')
      .sort({ startDateTime: 1 });

    const foundIds = new Set(performances.map((performance) => performance._id.toString()));
    const missingPerformanceIds = requestedPerformanceIds.filter((id) => !foundIds.has(id));

    const summary = {
      total: requestedPerformanceIds.length,
      created: 0,
      skipped: 0,
      failed: 0,
      failures: [],
    };

    for (const missingId of missingPerformanceIds) {
      summary.failed += 1;
      summary.failures.push({
        performanceId: missingId,
        reason: 'Performance not found.',
      });
    }

    const calendarClient = createCalendarClient(oauthClient);

    for (const performance of performances) {
      const performanceId = performance._id.toString();

      try {
        const eventPayload = buildEventPayload(performance, state.timezone, state.deviceUserId);
        if (!eventPayload.start.dateTime || !eventPayload.end.dateTime) {
          throw new Error('Performance date/time is invalid.');
        }

        const existingEvent = await findExistingEvent(
          calendarClient,
          performance,
          state.deviceUserId,
          eventPayload.summary
        );

        if (existingEvent) {
          summary.skipped += 1;
          continue;
        }

        await calendarClient.events.insert({
          calendarId: 'primary',
          requestBody: eventPayload,
        });

        summary.created += 1;
      } catch (eventError) {
        summary.failed += 1;
        summary.failures.push({
          performanceId,
          reason: toErrorMessage(eventError, 'Failed to export performance.'),
        });
      }
    }

    tokenRecord.lastUsedAt = new Date();
    await tokenRecord.save();

    return res.redirect(buildSuccessRedirectUrl(summary));
  } catch (err) {
    return res.redirect(buildErrorRedirectUrl(toErrorMessage(err, 'Calendar export failed.')));
  }
};