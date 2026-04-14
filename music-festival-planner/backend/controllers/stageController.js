const Stage = require('../models/Stage');

// GET /api/stages?festivalId=<id>
exports.getStagesByFestival = async (req, res) => {
  const { festivalId } = req.query;
  if (!festivalId) {
    return res.status(400).json({ message: 'festivalId query parameter is required.' });
  }
  try {
    const stages = await Stage.find({ festivalId });
    res.json(stages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stages
exports.createStage = async (req, res) => {
  const { festivalId, name, capacity, environment, status, notes } = req.body;

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return res.status(400).json({ message: 'capacity must be a positive integer.' });
  }

  try {
    // Stage names must be unique within a festival (case-insensitive).
    const duplicate = await Stage.findOne({
      festivalId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (duplicate) {
      return res
        .status(409)
        .json({ message: `A stage named "${name}" already exists for this festival.` });
    }

    const stage = new Stage({ festivalId, name, capacity, environment, status, notes });
    const saved = await stage.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/stages/:id — full replacement (festivalId is immutable)
exports.replaceStage = async (req, res) => {
  const { name, capacity, environment, status, notes } = req.body;

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return res.status(400).json({ message: 'capacity must be a positive integer.' });
  }

  try {
    const existing = await Stage.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Stage not found.' });

    const { festivalId } = existing;

    // Stage names must be unique within the festival, excluding this stage itself.
    const duplicate = await Stage.findOne({
      festivalId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res
        .status(409)
        .json({ message: `A stage named "${name}" already exists for this festival.` });
    }

    const stage = await Stage.findOneAndReplace(
      { _id: req.params.id },
      { festivalId, name, capacity, environment, status, notes: notes ?? '' },
      { new: true, runValidators: true }
    );
    res.json(stage);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/stages/festival/:festivalId
// Deletes ALL stages for a festival (cascade delete helper).
exports.deleteStagesByFestival = async (req, res) => {
  try {
    await Stage.deleteMany({ festivalId: req.params.festivalId });
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
