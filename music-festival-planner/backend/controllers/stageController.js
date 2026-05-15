const mongoose = require('mongoose');
const Stage = require('../models/stage');
const AppError = require('../middleware/AppError');

// Escape any special regex characters in a string so it's safe to embed inside a RegExp pattern.
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Check whether a value is a valid MongoDB ObjectId so we can catch bad IDs before querying.
function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

// Normalise the environment field to just 'indoor' or 'outdoor' since those are the only two values the frontend understands.
function mapEnvironment(environment) {
  // Frontend stage model expects only indoor/outdoor.
  return environment === 'indoor' ? 'indoor' : 'outdoor';
}

// Shape a raw stage database document into the object the API sends back to callers.
function mapStage(stageDoc) {
  // Build and return a plain object containing only the fields clients need.
  return {
    id: stageDoc._id.toString(),
    festivalId: stageDoc.festival.toString(),
    name: stageDoc.name,
    capacity: stageDoc.capacity,
    environment: mapEnvironment(stageDoc.environment),
    // Default to 'active' if no status was stored on the document.
    status: stageDoc.status || 'active',
    // Default to an empty string rather than returning null or undefined for notes.
    notes: stageDoc.notes || '',
  };
}

// GET /api/stages?festivalId=<id>
exports.getStagesByFestival = async (req, res, next) => {
  // Pull the festival ID out of the query string.
  const { festivalId } = req.query;
  // A festival ID is required — reject the request if it's missing.
  if (!festivalId) {
    return next(new AppError('festivalId query parameter is required.', 400));
  }

  // Reject IDs that aren't in the correct MongoDB format to avoid a database error.
  if (!isValidObjectId(festivalId)) {
    return next(new AppError('festivalId must be a valid ObjectId.', 400));
  }

  // Wrap the database query in a try block so errors surface cleanly.
  try {
    // Load all stages for the festival, sorted alphabetically by name.
    const stages = await Stage.find({ festival: festivalId }).sort({ name: 1 });
    // Shape each document before sending to avoid exposing internal fields.
    res.json(stages.map(mapStage));
  } catch (err) {
    // Pass any unexpected errors to the global error handler.
    next(err);
  }
};

// POST /api/stages
exports.createStage = async (req, res, next) => {
  // Pull all expected fields from the request body.
  const { festivalId, name, capacity, environment, status, notes } = req.body;

  // Wrap the database work in a try block.
  try {
    // Escape the stage name so it can be safely used in a case-insensitive regex query.
    const escapedName = escapeRegex(name);
    // Stage names must be unique within a festival (case-insensitive).
    const duplicate = await Stage.findOne({
      festival: festivalId,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });
    // Reject the request if a stage with this name already exists in the festival.
    if (duplicate) {
      return next(
        new AppError(`A stage named "${name}" already exists for this festival.`, 409)
      );
    }

    // Build the new stage document with all the provided fields.
    const stage = new Stage({
      festival: festivalId,
      name,
      capacity,
      environment,
      status,
      notes,
    });
    // Save the new stage to the database.
    const saved = await stage.save();
    // Return the created stage with a 201 status to indicate successful creation.
    res.status(201).json(mapStage(saved));
  } catch (err) {
    // Pass any save errors to the global error handler.
    next(err);
  }
};

// PUT /api/stages/:id — full replacement (festival reference is immutable)
exports.replaceStage = async (req, res, next) => {
  // Pull all replacement field values from the request body.
  const { name, capacity, environment, status, notes } = req.body;

  // Wrap the database work in a try block.
  try {
    // Load the existing stage so we can verify it exists and preserve its festival reference.
    const existing = await Stage.findById(req.params.id);
    // Return a 404 if no stage with this ID was found.
    if (!existing) return next(new AppError('Stage not found.', 404));

    // Escape the new name so it can be used safely in a regex duplicate check.
    const escapedName = escapeRegex(name);
    // Stage names must be unique within the festival, excluding this stage itself.
    const duplicate = await Stage.findOne({
      festival: existing.festival,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      // Exclude the current stage so it doesn't conflict with its own existing name.
      _id: { $ne: req.params.id },
    });
    // Reject the replacement if another stage in the festival already has this name.
    if (duplicate) {
      return next(
        new AppError(`A stage named "${name}" already exists for this festival.`, 409)
      );
    }

    // Overwrite every mutable field on the existing document.
    existing.name = name;
    existing.capacity = capacity;
    existing.environment = environment;
    existing.status = status;
    // Default notes to an empty string rather than storing null.
    existing.notes = notes ?? '';

    // Save the updated document.
    const saved = await existing.save();
    // Return the replaced stage.
    res.json(mapStage(saved));
  } catch (err) {
    // Forward any unexpected errors to the global handler.
    next(err);
  }
};

// DELETE /api/stages/festival/:festivalId
// Deletes ALL stages for a festival (cascade delete helper).
exports.deleteStagesByFestival = async (req, res, next) => {
  // Wrap the delete in a try block.
  try {
    // Remove every stage that belongs to this festival in a single query.
    await Stage.deleteMany({ festival: req.params.festivalId });
    // Respond with no content to indicate everything was removed.
    res.status(204).send();
  } catch (err) {
    // Forward unexpected errors to the global handler.
    next(err);
  }
};

// DELETE /api/stages/:id
exports.deleteStage = async (req, res, next) => {
  // Wrap the delete in a try block.
  try {
    // Find the stage by ID and delete it in one step.
    const stage = await Stage.findByIdAndDelete(req.params.id);
    // If nothing was deleted, the stage didn't exist.
    if (!stage) return next(new AppError('Stage not found.', 404));
    // Respond with no content to confirm the deletion.
    res.status(204).send();
  } catch (err) {
    // Forward unexpected errors to the global handler.
    next(err);
  }
};
