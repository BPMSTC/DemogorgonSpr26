const Festival   = require('../models/Festival');
const Stage       = require('../models/Stage');
const Performance = require('../models/Performance');

const SORT_FIELDS = new Set(['startDate', 'endDate', 'name', 'location', 'capacity']);
const PATCHABLE_FIELDS = new Set(['name', 'startDate', 'endDate', 'location', 'genre', 'capacity']);

// GET /api/festivals
// Optional: ?sortBy=startDate&order=asc&page=1&limit=10
exports.getAllFestivals = async (req, res) => {
  const { sortBy = 'startDate', order = 'asc', page, limit } = req.query;

  const sortField = SORT_FIELDS.has(sortBy) ? sortBy : 'startDate';
  const sortOrder = order === 'desc' ? -1 : 1;

  try {
    if (page || limit) {
      const pageNum  = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip     = (pageNum - 1) * limitNum;
      const [festivals, total] = await Promise.all([
        Festival.find().sort({ [sortField]: sortOrder }).skip(skip).limit(limitNum),
        Festival.countDocuments(),
      ]);
      return res.json({
        data: festivals,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    const festivals = await Festival.find().sort({ [sortField]: sortOrder });
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

// PUT /api/festivals/:id — full replacement
exports.replaceFestival = async (req, res) => {
  const { name, startDate, endDate, location, genre, capacity } = req.body;

  if (!name || !startDate || !endDate || !location) {
    return res.status(400).json({
      message: 'name, startDate, endDate, and location are required.',
    });
  }
  if (endDate < startDate) {
    return res.status(400).json({ message: 'The end date must be on or after the start date.' });
  }

  try {
    const replacement = { name, startDate, endDate, location };
    if (genre    != null) replacement.genre    = genre;
    if (capacity != null) replacement.capacity = capacity;

    const festival = await Festival.findOneAndReplace(
      { _id: req.params.id },
      replacement,
      { new: true, runValidators: true }
    );
    if (!festival) return res.status(404).json({ message: 'Festival not found.' });
    res.json(festival);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PATCH /api/festivals/:id
exports.updateFestival = async (req, res) => {
  try {
    const festival = await Festival.findById(req.params.id);
    if (!festival) return res.status(404).json({ message: 'Festival not found.' });

    const updates = Object.entries(req.body).reduce((acc, [key, value]) => {
      if (PATCHABLE_FIELDS.has(key)) {
        acc[key] = value;
      }
      return acc;
    }, {});

    const nextStartDate = updates.startDate ?? festival.startDate;
    const nextEndDate = updates.endDate ?? festival.endDate;
    if (nextEndDate < nextStartDate) {
      return res.status(400).json({ message: 'The end date must be on or after the start date.' });
    }

    const updatedFestival = await Festival.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedFestival) return res.status(404).json({ message: 'Festival not found.' });
    res.json(updatedFestival);
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
