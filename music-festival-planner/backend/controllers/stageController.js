const Stage = require('../models/stage');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
exports.getStagesByFestival = async (req, res) => {
  const { festivalId } = req.query;
  if (!festivalId) {
    return res.status(400).json({ message: 'festivalId query parameter is required.' });
  }
  try {
    const stages = await Stage.find({ festival: festivalId }).sort({ name: 1 });
    res.json(stages.map(mapStage));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stages
exports.createStage = async (req, res) => {
  const { festivalId, name, capacity, environment, status, notes } = req.body;

  if (!festivalId || !name) {
    return res.status(400).json({ message: 'festivalId and name are required.' });
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return res.status(400).json({ message: 'capacity must be a positive integer.' });
  }

  try {
    const escapedName = escapeRegex(name);
    // Stage names must be unique within a festival (case-insensitive).
    const duplicate = await Stage.findOne({
      festival: festivalId,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });
    if (duplicate) {
      return res
        .status(409)
        .json({ message: `A stage named "${name}" already exists for this festival.` });
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
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/stages/:id — full replacement (festival reference is immutable)
exports.replaceStage = async (req, res) => {
  const { name, capacity, environment, status, notes } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'name is required.' });
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return res.status(400).json({ message: 'capacity must be a positive integer.' });
  }

  try {
    const existing = await Stage.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Stage not found.' });

    const escapedName = escapeRegex(name);
    // Stage names must be unique within the festival, excluding this stage itself.
    const duplicate = await Stage.findOne({
      festival: existing.festival,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res
        .status(409)
        .json({ message: `A stage named "${name}" already exists for this festival.` });
    }

    existing.name = name;
    existing.capacity = capacity;
    existing.environment = environment;
    existing.status = status;
    existing.notes = notes ?? '';

    const saved = await existing.save();
    res.json(mapStage(saved));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/stages/festival/:festivalId
// Deletes ALL stages for a festival (cascade delete helper).
exports.deleteStagesByFestival = async (req, res) => {
  try {
    await Stage.deleteMany({ festival: req.params.festivalId });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/stages/:id
exports.deleteStage = async (req, res) => {
  try {
    const stage = await Stage.findByIdAndDelete(req.params.id);
    if (!stage) return res.status(404).json({ message: 'Stage not found.' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
