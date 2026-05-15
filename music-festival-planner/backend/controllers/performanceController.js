const mongoose = require('mongoose');
const Performance = require('../models/performance');
const Stage = require('../models/stage');
const Artist = require('../models/artist');
const AppError = require('../middleware/AppError');

// List the fields that are allowed as sort keys so callers can't sort by arbitrary database fields.
const PERF_SORT_FIELDS = new Set(['date', 'startTime', 'endTime', 'artistName', 'stageName', 'genre']);

// Escape any special regex characters in a string so it's safe to use inside a RegExp pattern.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Trim and collapse any extra internal whitespace in a name so comparisons are consistent.
function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

// Convert a "HH:MM" time string into a total number of minutes since midnight.
function toMinutes(time) {
  // Try to match the expected time format.
  const match = /^(\d{1,2}):(\d{2})$/.exec((time || '').trim());
  // Return null if the string doesn't match the expected pattern.
  if (!match) return null;
  // Parse the hours and minutes out of the match groups.
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  // Reject non-integer values — time must be whole numbers.
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  // Reject times that fall outside the valid 24-hour range.
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  // Return the total minutes so times can be compared as plain numbers.
  return hours * 60 + minutes;
}

// Extract just the date portion from a date/time value and return it as a YYYY-MM-DD string.
function toDateOnly(value) {
  // Return an empty string immediately if nothing was passed in.
  if (!value) return '';
  // Parse the value into a proper Date object.
  const dateValue = new Date(value);
  // Return an empty string if the value couldn't be parsed.
  if (Number.isNaN(dateValue.getTime())) return '';
  // Slice off only the date part of the ISO string.
  return dateValue.toISOString().slice(0, 10);
}

// Extract just the time portion from a date/time value and return it as an HH:MM string.
function toTimeOnly(value) {
  // Return an empty string immediately if nothing was passed in.
  if (!value) return '';
  // Parse the value into a proper Date object.
  const dateValue = new Date(value);
  // Return an empty string if the value couldn't be parsed.
  if (Number.isNaN(dateValue.getTime())) return '';
  // Slice the hours and minutes out of the ISO string.
  return dateValue.toISOString().slice(11, 16);
}

// Combine a YYYY-MM-DD date string and an HH:MM time string into a UTC Date object.
function buildUtcDate(dateText, timeText) {
  // Try to pull the hours and minutes out of the time string.
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec((timeText || '').trim());
  // Reject the input if either the date or time format is wrong.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText)) || !timeMatch) {
    return null;
  }

  // Convert the matched strings to numbers for validation.
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  // Reject times outside the valid 24-hour range.
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  // Build a full ISO 8601 string and parse it as a UTC date.
  const isoValue = `${dateText}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
  const parsed = new Date(isoValue);
  // Return null if the assembled string still couldn't be parsed.
  if (Number.isNaN(parsed.getTime())) return null;
  // Return the valid UTC Date object.
  return parsed;
}

// Shape a raw performance database document into the object the API sends back to callers.
function mapPerformance(doc) {
  // Safely extract the stage name, defaulting to an empty string if the stage wasn't populated.
  const stageName = typeof doc.stage === 'object' && doc.stage?.name ? doc.stage.name : '';
  // Safely extract the artist name, defaulting to an empty string if the artist wasn't populated.
  const artistName = typeof doc.artist === 'object' && doc.artist?.name ? doc.artist.name : '';

  // Build and return the plain response object with only the fields clients need.
  return {
    id: doc._id.toString(),
    festivalId: doc.festival.toString(),
    artistName,
    stageName,
    date: toDateOnly(doc.startDateTime),
    startTime: toTimeOnly(doc.startDateTime),
    endTime: toTimeOnly(doc.endDateTime),
    // Use the performance's own genre if set, falling back to the artist's genre.
    genre: doc.genre || (typeof doc.artist === 'object' ? doc.artist?.genre : undefined),
  };
}

// Find a stage within a specific festival by name, using a case-insensitive match.
async function resolveStage(festivalId, stageName) {
  // Normalise the name so spacing differences don't cause a miss.
  const normalizedStageName = normalizeName(stageName);

  // Search for a stage whose name matches exactly (ignoring case) within the given festival.
  return Stage.findOne({
    festival: festivalId,
    name: { $regex: new RegExp(`^${escapeRegex(normalizedStageName)}$`, 'i') },
  });
}

// Find or create an artist by name, optionally filling in their genre if it was missing.
async function resolveArtist(artistName, genre) {
  // Normalise the artist name to avoid creating duplicates with different spacing.
  const normalizedArtistName = normalizeName(artistName);
  // Check whether this artist already exists in the database.
  const existing = await Artist.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalizedArtistName)}$`, 'i') },
  });

  // If the artist already exists, update their genre if they didn't have one yet.
  if (existing) {
    if (!existing.genre && genre) {
      existing.genre = genre;
      await existing.save();
    }
    // Return the existing artist record.
    return existing;
  }

  // No existing artist found, so create a new one with the provided details.
  const artist = new Artist({
    name: normalizedArtistName,
    // Use 'Unknown' as a placeholder if no genre was provided.
    genre: genre || 'Unknown',
    description: '',
  });
  // Save and return the new artist record.
  return artist.save();
}

// Check whether a given stage is already booked for a time window that overlaps the proposed slot.
async function isStageOccupied(festivalId, stageId, startDateTime, endDateTime, excludeId) {
  // Build the overlap query — any performance that starts before our end and ends after our start overlaps.
  const query = {
    festival: festivalId,
    stage: stageId,
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  };
  // When updating an existing performance, exclude it from the conflict check so it doesn't conflict with itself.
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  // Run a lightweight existence check rather than loading a full document.
  const conflict = await Performance.exists(query);
  // Return true if any conflicting booking was found.
  return Boolean(conflict);
}

// Sort a list of already-mapped performance objects by the requested field and direction.
function sortPerformances(items, sortBy = 'date', order = 'asc') {
  // Determine the sort direction multiplier: 1 for ascending, -1 for descending.
  const direction = order === 'desc' ? -1 : 1;
  // Only sort by known fields; default to 'date' for anything unrecognised.
  const field = PERF_SORT_FIELDS.has(sortBy) ? sortBy : 'date';

  // Create a copy of the array so we don't mutate the original, then sort it.
  const sorted = [...items].sort((a, b) => {
    // Read the sort value for each item, defaulting to an empty string if missing.
    const left = a[field] ?? '';
    const right = b[field] ?? '';

    // Time fields need to be compared numerically by total minutes, not as strings.
    if (field === 'startTime' || field === 'endTime') {
      const leftMinutes = toMinutes(left) ?? 0;
      const rightMinutes = toMinutes(right) ?? 0;
      return (leftMinutes - rightMinutes) * direction;
    }

    // For all other fields, use locale-aware string comparison.
    return String(left).localeCompare(String(right)) * direction;
  });

  // When sorting by date, break ties by also sorting by start time within each day.
  if (field === 'date') {
    sorted.sort((a, b) => {
      // If both performances are on the same day, order them by start time.
      if (a.date === b.date) {
        return ((toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0)) * direction;
      }
      // Otherwise, compare the date strings directly.
      return a.date.localeCompare(b.date) * direction;
    });
  }

  // Return the fully sorted list.
  return sorted;
}

// GET /api/performances?festivalId=<id>
// Optional: &sortBy=date&order=asc&page=1&limit=20
exports.getPerformancesByFestival = async (req, res, next) => {
  // Pull the festival ID and any sorting/pagination options from the query string.
  const { festivalId, sortBy = 'date', order = 'asc', page, limit } = req.query;
  // A festival ID is required — reject the request without one.
  if (!festivalId) {
    return next(new AppError('festivalId query parameter is required.', 400));
  }
  // Reject IDs that aren't in the correct MongoDB format to avoid a database error.
  if (!mongoose.isValidObjectId(festivalId)) {
    return next(new AppError('festivalId must be a valid ObjectId.', 400));
  }

  // Wrap the database query in a try block.
  try {
    // Load all performances for the festival, including the artist and stage details.
    const docs = await Performance.find({ festival: festivalId })
      .populate('artist', 'name genre')
      .populate('stage', 'name')
      .sort({ startDateTime: 1 });

    // Convert the raw database documents into the response shape and apply the requested sort.
    const sorted = sortPerformances(docs.map(mapPerformance), sortBy, order);

    // If pagination was requested, slice and return just the requested page.
    if (page || limit) {
      // Clamp the page number to at least 1.
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      // Clamp the page size between 1 and 200.
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
      // Work out the index of the first item on the requested page.
      const start = (pageNum - 1) * limitNum;
      // Slice out the relevant portion of the sorted results.
      const data = sorted.slice(start, start + limitNum);

      // Return the page data along with metadata for building pagination controls.
      return res.json({
        data,
        total: sorted.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(sorted.length / limitNum),
      });
    }

    // No pagination requested — return the full sorted list.
    res.json(sorted);
  } catch (err) {
    // Pass any unexpected errors to the global error handler.
    next(err);
  }
};

// POST /api/performances
exports.createPerformance = async (req, res, next) => {
  // Pull all the expected fields out of the request body.
  const { festivalId, artistName, stageName, date, startTime, endTime, genre } = req.body;

  // Convert the time strings to minutes so we can validate and compare them.
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  // Reject the request if either time string couldn't be parsed.
  if (startMinutes === null || endMinutes === null) {
    return next(new AppError('Start and end times must be valid 24-hour times (H:mm or HH:mm).', 400));
  }
  // Reject the request if the performance would end before or at the same time it starts.
  if (startMinutes >= endMinutes) {
    return next(new AppError('End time must be later than start time.', 400));
  }

  // Build proper UTC Date objects from the date and time strings.
  const startDateTime = buildUtcDate(date, startTime);
  const endDateTime = buildUtcDate(date, endTime);
  // Reject the request if the date string is malformed.
  if (!startDateTime || !endDateTime) {
    return next(new AppError('date must be in YYYY-MM-DD format.', 400));
  }

  // Wrap the database work in a try block.
  try {
    // Look up the named stage within the festival to get its ID.
    const stage = await resolveStage(festivalId, stageName);
    // Reject the request if no matching stage was found.
    if (!stage) {
      return next(new AppError(`Stage "${stageName}" was not found for this festival.`, 400));
    }

    // Check whether the stage is already booked during the requested time slot.
    const conflict = await isStageOccupied(festivalId, stage._id, startDateTime, endDateTime);
    // Reject the request if there's a scheduling conflict.
    if (conflict) {
      return next(new AppError(`"${stageName}" is already booked during that time slot.`, 409));
    }

    // Find or create the artist record for this performance.
    const artist = await resolveArtist(artistName, genre);

    // Build the new performance document.
    const performance = new Performance({
      festival: festivalId,
      artist: artist._id,
      stage: stage._id,
      startDateTime,
      endDateTime,
      // Use the provided genre, or fall back to the artist's genre.
      genre: genre || artist.genre || '',
    });

    // Save the performance to the database.
    const saved = await performance.save();
    // Reload the saved performance with artist and stage names populated for the response.
    const hydrated = await Performance.findById(saved._id)
      .populate('artist', 'name genre')
      .populate('stage', 'name');

    // Return the created performance with a 201 Created status.
    res.status(201).json(mapPerformance(hydrated));
  } catch (err) {
    // Pass any unexpected errors to the global error handler.
    next(err);
  }
};

// PUT /api/performances/:id — full replacement (festival reference is immutable)
exports.replacePerformance = async (req, res, next) => {
  // Pull all replacement field values from the request body.
  const { artistName, stageName, date, startTime, endTime, genre } = req.body;

  // Convert the time strings to minutes so we can validate them.
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  // Reject the request if either time string is invalid.
  if (startMinutes === null || endMinutes === null) {
    return next(new AppError('Start and end times must be valid 24-hour times (H:mm or HH:mm).', 400));
  }
  // Reject the request if the time slot has zero or negative duration.
  if (startMinutes >= endMinutes) {
    return next(new AppError('End time must be later than start time.', 400));
  }

  // Build UTC Date objects from the incoming date and time strings.
  const startDateTime = buildUtcDate(date, startTime);
  const endDateTime = buildUtcDate(date, endTime);
  // Reject the request if the date string couldn't be parsed.
  if (!startDateTime || !endDateTime) {
    return next(new AppError('date must be in YYYY-MM-DD format.', 400));
  }

  // Wrap the database work in a try block.
  try {
    // Load the existing performance to verify it exists and to preserve its festival reference.
    const existing = await Performance.findById(req.params.id);
    // Return a 404 if no performance with this ID was found.
    if (!existing) return next(new AppError('Performance not found.', 404));

    // Resolve the stage within the same festival the performance already belongs to.
    const stage = await resolveStage(existing.festival, stageName);
    // Reject if the named stage doesn't exist in this festival.
    if (!stage) {
      return next(new AppError(`Stage "${stageName}" was not found for this festival.`, 400));
    }

    // Check for scheduling conflicts, excluding this performance from the check.
    const conflict = await isStageOccupied(
      existing.festival,
      stage._id,
      startDateTime,
      endDateTime,
      req.params.id
    );
    // Reject if another performance already occupies this stage during the requested slot.
    if (conflict) {
      return next(new AppError(`"${stageName}" is already booked during that time slot.`, 409));
    }

    // Find or create the artist for this replacement.
    const artist = await resolveArtist(artistName, genre);

    // Overwrite every mutable field on the existing document.
    existing.artist = artist._id;
    existing.stage = stage._id;
    existing.startDateTime = startDateTime;
    existing.endDateTime = endDateTime;
    // Use the provided genre, or fall back to the artist's genre.
    existing.genre = genre || artist.genre || '';

    // Save the updated document.
    await existing.save();

    // Reload with populated artist and stage names for the response.
    const hydrated = await Performance.findById(existing._id)
      .populate('artist', 'name genre')
      .populate('stage', 'name');

    // Return the replaced performance.
    res.json(mapPerformance(hydrated));
  } catch (err) {
    // Pass any unexpected errors to the global error handler.
    next(err);
  }
};

// DELETE /api/performances/festival/:festivalId
// Deletes ALL performances for a festival (cascade delete helper).
exports.deletePerformancesByFestival = async (req, res, next) => {
  // Wrap the delete in a try block.
  try {
    // Remove every performance that belongs to this festival in a single query.
    await Performance.deleteMany({ festival: req.params.festivalId });
    // Respond with no content to indicate everything was removed.
    res.status(204).send();
  } catch (err) {
    // Forward unexpected errors to the global handler.
    next(err);
  }
};

// DELETE /api/performances/:id
exports.deletePerformance = async (req, res, next) => {
  // Wrap the delete in a try block.
  try {
    // Find the performance by ID and delete it in one step.
    const performance = await Performance.findByIdAndDelete(req.params.id);
    // If nothing was deleted, the performance didn't exist.
    if (!performance) return next(new AppError('Performance not found.', 404));
    // Respond with no content to confirm the deletion.
    res.status(204).send();
  } catch (err) {
    // Forward unexpected errors to the global handler.
    next(err);
  }
};
