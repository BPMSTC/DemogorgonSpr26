const Festival   = require('../models/Festival');
const Stage       = require('../models/Stage');
const Performance = require('../models/Performance');

// GET /api/festivals
exports.getAllFestivals = async (req, res) => {
  try {
    const festivals = await Festival.find().sort({ startDate: 1 });
    res.json(festivals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/festivals/:id
// Returns the festival with its stages and performances embedded.
exports.getFestivalById = async (req, res) => {
  try {
    const festival = await Festival.findById(req.params.id);
    if (!festival) return res.status(404).json({ message: 'Festival not found.' });

    const festivalId = festival._id.toString();
    const [stages, performances] = await Promise.all([
      Stage.find({ festivalId }),
      Performance.find({ festivalId }).sort({ date: 1, startTime: 1 }),
    ]);

    res.json({ ...festival.toJSON(), stages, performances });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/festivals
exports.createFestival = async (req, res) => {
  const { name, startDate, endDate, location, genre, capacity } = req.body;

  if (endDate < startDate) {
    return res
      .status(400)
      .json({ message: 'The end date must be on or after the start date.' });
  }

  try {
    const festival = new Festival({ name, startDate, endDate, location, genre, capacity });
    const saved = await festival.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PATCH /api/festivals/:id
exports.updateFestival = async (req, res) => {
  try {
    const festival = await Festival.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!festival) return res.status(404).json({ message: 'Festival not found.' });
    res.json(festival);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/festivals/:id
// Cascade-deletes all stages and performances for the festival.
exports.deleteFestival = async (req, res) => {
  try {
    const festival = await Festival.findByIdAndDelete(req.params.id);
    if (!festival) return res.status(404).json({ message: 'Festival not found.' });

    const festivalId = festival._id.toString();
    await Promise.all([
      Stage.deleteMany({ festivalId }),
      Performance.deleteMany({ festivalId }),
    ]);

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
