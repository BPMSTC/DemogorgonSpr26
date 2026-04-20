const mongoose = require('mongoose');
const Stage = require('../models/stage');
const AppError = require('../middleware/AppError');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function mapEnvironment(environment) {
  // Frontend stage model expects only indoor/outdoor.
  return environment === 'indoor' ? 'indoor' : 'outdoor';
}

function mapStage(stageDoc) {
  return {
    id: stageDoc._id.toString(),
    festivalId: stageDoc.festival.toString(),
    name: stageDoc.name,
    capacity: stageDoc.capacity,
    environment: mapEnvironment(stageDoc.environment),
    status: stageDoc.status || 'active',
    notes: stageDoc.notes || '',
  };
}

// GET /api/stages?festivalId=<id>
exports.getStagesByFestival = async (req, res, next) => {
  const { festivalId } = req.query;
  if (!festivalId) {
    return next(new AppError('festivalId query parameter is required.', 400));
  }

  if (!isValidObjectId(festivalId)) {
    return next(new AppError('festivalId must be a valid ObjectId.', 400));
  }

  try {
    const stages = await Stage.find({ festival: festivalId }).sort({ name: 1 });
    res.json(stages.map(mapStage));
  } catch (err) {
    next(err);
  }
};

// POST /api/stages
exports.createStage = async (req, res, next) => {
  const { festivalId, name, capacity, environment, status, notes } = req.body;

  try {
    const escapedName = escapeRegex(name);
    // Stage names must be unique within a festival (case-insensitive).
    const duplicate = await Stage.findOne({
      festival: festivalId,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });
    if (duplicate) {
      return next(
        new AppError(`A stage named "${name}" already exists for this festival.`, 409)
      );
    }

    const stage = new Stage({
      festival: festivalId,
      name,
      capacity,
      environment,
      status,
      notes,
    });
    const saved = await stage.save();
    res.status(201).json(mapStage(saved));
  } catch (err) {
    next(err);
  }
};

// PUT /api/stages/:id — full replacement (festival reference is immutable)
exports.replaceStage = async (req, res, next) => {
  const { name, capacity, environment, status, notes } = req.body;

  try {
    const existing = await Stage.findById(req.params.id);
    if (!existing) return next(new AppError('Stage not found.', 404));

    const escapedName = escapeRegex(name);
    // Stage names must be unique within the festival, excluding this stage itself.
    const duplicate = await Stage.findOne({
      festival: existing.festival,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return next(
        new AppError(`A stage named "${name}" already exists for this festival.`, 409)
      );
    }

    existing.name = name;
    existing.capacity = capacity;
    existing.environment = environment;
    existing.status = status;
    existing.notes = notes ?? '';

    const saved = await existing.save();
    res.json(mapStage(saved));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/stages/festival/:festivalId
// Deletes ALL stages for a festival (cascade delete helper).
exports.deleteStagesByFestival = async (req, res, next) => {
  try {
    await Stage.deleteMany({ festival: req.params.festivalId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// DELETE /api/stages/:id
exports.deleteStage = async (req, res, next) => {
  try {
    const stage = await Stage.findByIdAndDelete(req.params.id);
    if (!stage) return next(new AppError('Stage not found.', 404));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
