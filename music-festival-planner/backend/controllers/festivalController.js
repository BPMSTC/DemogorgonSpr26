const Festival = require('../models/festival');
const Stage = require('../models/stage');
const Performance = require('../models/performance');
const AppError = require('../middleware/AppError');

// List the fields that are allowed as sort keys to prevent arbitrary database sorting.
const SORT_FIELDS = new Set(['startDate', 'endDate', 'name', 'location', 'capacity']);
// List the fields that callers are allowed to update via a PATCH request.
const PATCHABLE_FIELDS = new Set([
  'name',
  'startDate',
  'endDate',
  'location',
  'genre',
  'capacity',
  'description',
  'imageUrl',
]);

// Convert a date value to a plain YYYY-MM-DD string, returning an empty string if the date is invalid.
function toDateOnly(value) {
  // Return an empty string immediately if nothing was passed in.
  if (!value) return '';
  // Parse the value into a proper Date object.
  const dateValue = new Date(value);
  // If parsing failed, return an empty string rather than "Invalid Date".
  if (Number.isNaN(dateValue.getTime())) return '';
  // Slice off just the date portion of the ISO string.
  return dateValue.toISOString().slice(0, 10);
}

// Shape a raw festival database document into the object the API sends back to callers.
function mapFestival(festivalDoc) {
  // Build and return a plain object containing only the fields clients need.
  return {
    id: festivalDoc._id.toString(),
    name: festivalDoc.name,
    startDate: toDateOnly(festivalDoc.startDate),
    endDate: toDateOnly(festivalDoc.endDate),
    location: festivalDoc.location,
    // Only include optional fields when they actually have a value.
    imageUrl: festivalDoc.imageUrl || undefined,
    genre: festivalDoc.genre || undefined,
    // Only expose capacity when it's a positive number.
    capacity:
      typeof festivalDoc.capacity === 'number' && festivalDoc.capacity > 0
        ? festivalDoc.capacity
        : undefined,
  };
}

// Try to turn a raw value into a Date object, returning null if it's missing or unparseable.
function parseDateOrNull(value) {
  // Treat empty or missing values as "no date provided".
  if (!value) return null;
  // Attempt to parse the value into a Date.
  const parsed = new Date(value);
  // If JavaScript couldn't make sense of it, signal failure with null.
  if (Number.isNaN(parsed.getTime())) return null;
  // Return the successfully parsed date.
  return parsed;
}

// GET /api/festivals
// Optional: ?sortBy=startDate&order=asc&page=1&limit=10
exports.getAllFestivals = async (req, res, next) => {
  // Pull sorting and pagination options out of the query string, using sensible defaults.
  const { sortBy = 'startDate', order = 'asc', page, limit } = req.query;

  // Only allow sorting by known fields; fall back to startDate if an unrecognised field is given.
  const sortField = SORT_FIELDS.has(sortBy) ? sortBy : 'startDate';
  // Convert the order string into the +1 / -1 direction MongoDB expects.
  const sortOrder = order === 'desc' ? -1 : 1;

  // Wrap the database queries in a try block so errors surface cleanly.
  try {
    // If pagination parameters were provided, return a paged response.
    if (page || limit) {
      // Clamp the page number so it's at least 1.
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      // Clamp the page size between 1 and 100.
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      // Work out how many records to skip to reach the requested page.
      const skip = (pageNum - 1) * limitNum;
      // Fetch the page of festivals and the total count at the same time for efficiency.
      const [festivals, total] = await Promise.all([
        Festival.find()
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum),
        Festival.countDocuments(),
      ]);

      // Return the paged data along with metadata so the client can build pagination controls.
      return res.json({
        data: festivals.map(mapFestival),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    // No pagination requested — return the full list sorted by the chosen field.
    const festivals = await Festival.find().sort({ [sortField]: sortOrder });
    // Shape each document before sending to avoid exposing internal fields.
    res.json(festivals.map(mapFestival));
  } catch (err) {
    // Hand off any unexpected database errors to the global error handler.
    next(err);
  }
};

// GET /api/festivals/:id
exports.getFestivalById = async (req, res, next) => {
  // Wrap the lookup in a try block to handle database errors gracefully.
  try {
    // Attempt to find the festival using the ID from the URL.
    const festival = await Festival.findById(req.params.id);
    // If nothing was found, respond with a clear 404 error.
    if (!festival) return next(new AppError('Festival not found.', 404));
    // Shape and return the found festival.
    res.json(mapFestival(festival));
  } catch (err) {
    // Pass unexpected errors to the global handler.
    next(err);
  }
};

// POST /api/festivals
exports.createFestival = async (req, res, next) => {
  // Pull all expected fields from the request body.
  const { name, startDate, endDate, location, genre, capacity, description, imageUrl } = req.body;

  // Parse the date strings into real Date objects so we can validate and store them.
  const parsedStartDate = parseDateOrNull(startDate);
  const parsedEndDate = parseDateOrNull(endDate);

  // Reject the request if either date is missing or couldn't be parsed.
  if (!parsedStartDate || !parsedEndDate) {
    return next(new AppError('startDate and endDate must be valid dates.', 400));
  }

  // Reject the request if the festival would end before it begins.
  if (parsedEndDate < parsedStartDate) {
    return next(new AppError('The end date must be on or after the start date.', 400));
  }

  // Wrap the database write in a try block.
  try {
    // Build the new festival document with all the provided fields.
    const festival = new Festival({
      name,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      location,
      genre,
      capacity,
      description,
      imageUrl,
    });
    // Save the new festival to the database.
    const saved = await festival.save();
    // Respond with the created festival and a 201 status to indicate successful creation.
    res.status(201).json(mapFestival(saved));
  } catch (err) {
    // Pass any save errors to the global error handler.
    next(err);
  }
};

// PUT /api/festivals/:id — full replacement
exports.replaceFestival = async (req, res, next) => {
  // Pull all the replacement field values from the request body.
  const { name, startDate, endDate, location, genre, capacity, description, imageUrl } = req.body;

  // Parse both dates before validating them.
  const parsedStartDate = parseDateOrNull(startDate);
  const parsedEndDate = parseDateOrNull(endDate);

  // Both dates are required for a full replacement, so reject if either is missing or invalid.
  if (!parsedStartDate || !parsedEndDate) {
    return next(new AppError('startDate and endDate must be valid dates.', 400));
  }

  // Ensure the end date doesn't come before the start date.
  if (parsedEndDate < parsedStartDate) {
    return next(new AppError('The end date must be on or after the start date.', 400));
  }

  // Wrap the replacement operation in a try block.
  try {
    // Build the full replacement document, supplying empty defaults for optional fields.
    const replacement = {
      name,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      location,
      // Use an empty string when optional fields are absent so old values are fully cleared.
      genre: genre ?? '',
      capacity: typeof capacity === 'number' ? capacity : 0,
      description: description ?? '',
      imageUrl: imageUrl ?? '',
    };

    // Swap out the existing document entirely with the new replacement.
    const festival = await Festival.findOneAndReplace({ _id: req.params.id }, replacement, {
      new: true,
      runValidators: true,
    });
    // If no document matched the ID, report a 404.
    if (!festival) return next(new AppError('Festival not found.', 404));
    // Return the newly saved festival.
    res.json(mapFestival(festival));
  } catch (err) {
    // Forward any unexpected errors to the global error handler.
    next(err);
  }
};

// PATCH /api/festivals/:id
exports.updateFestival = async (req, res, next) => {
  // Wrap the whole operation in a try block.
  try {
    // Load the existing festival so we can merge changes into it.
    const festival = await Festival.findById(req.params.id);
    // Return a 404 if no festival with that ID exists.
    if (!festival) return next(new AppError('Festival not found.', 404));

    // Build an object containing only the fields from the request that we actually allow to change.
    const updates = Object.entries(req.body).reduce((acc, [key, value]) => {
      // Skip any fields that aren't in the allow-list.
      if (PATCHABLE_FIELDS.has(key)) {
        acc[key] = value;
      }
      return acc;
    }, {});

    // If a new start date was provided, validate and convert it before saving.
    if (updates.startDate) {
      const parsed = parseDateOrNull(updates.startDate);
      // Reject the whole request if the provided start date can't be parsed.
      if (!parsed) return next(new AppError('Invalid startDate.', 400));
      updates.startDate = parsed;
    }

    // If a new end date was provided, validate and convert it before saving.
    if (updates.endDate) {
      const parsed = parseDateOrNull(updates.endDate);
      // Reject the whole request if the provided end date can't be parsed.
      if (!parsed) return next(new AppError('Invalid endDate.', 400));
      updates.endDate = parsed;
    }

    // Work out what the start and end dates will be after this update is applied.
    const nextStartDate = updates.startDate ?? festival.startDate;
    const nextEndDate = updates.endDate ?? festival.endDate;
    // Reject the update if the resulting date range would be invalid.
    if (nextEndDate < nextStartDate) {
      return next(new AppError('The end date must be on or after the start date.', 400));
    }

    // Apply only the changed fields and get the updated document back.
    const updatedFestival = await Festival.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    );
    // Guard against a race condition where the record was deleted between the findById and update.
    if (!updatedFestival) return next(new AppError('Festival not found.', 404));
    // Return the updated festival to the caller.
    res.json(mapFestival(updatedFestival));
  } catch (err) {
    // Pass any database errors to the global handler.
    next(err);
  }
};

// DELETE /api/festivals/:id
// Cascade-deletes all stages and performances for the festival.
exports.deleteFestival = async (req, res, next) => {
  // Wrap the delete operation in a try block.
  try {
    // Find and remove the festival in one step.
    const festival = await Festival.findByIdAndDelete(req.params.id);
    // If nothing was deleted, the festival didn't exist.
    if (!festival) return next(new AppError('Festival not found.', 404));

    // Remove all stages and performances that belong to this festival at the same time.
    await Promise.all([
      Stage.deleteMany({ festival: festival._id }),
      Performance.deleteMany({ festival: festival._id }),
    ]);

    // Respond with no content to confirm the deletion was successful.
    res.status(204).send();
  } catch (err) {
    // Forward any unexpected errors to the global handler.
    next(err);
  }
};
