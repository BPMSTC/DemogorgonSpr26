const Festival = require('../models/festival');
const Stage = require('../models/stage');
const Performance = require('../models/performance');

const SORT_FIELDS = new Set(['startDate', 'endDate', 'name', 'location', 'capacity']);
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

function toDateOnly(value) {
  if (!value) return '';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '';
  return dateValue.toISOString().slice(0, 10);
}

function mapFestival(festivalDoc) {
  return {
    id: festivalDoc._id.toString(),
    name: festivalDoc.name,
    startDate: toDateOnly(festivalDoc.startDate),
    endDate: toDateOnly(festivalDoc.endDate),
    location: festivalDoc.location,
    genre: festivalDoc.genre || undefined,
    capacity:
      typeof festivalDoc.capacity === 'number' && festivalDoc.capacity > 0
        ? festivalDoc.capacity
        : undefined,
  };
}

function parseDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

// GET /api/festivals
// Optional: ?sortBy=startDate&order=asc&page=1&limit=10
exports.getAllFestivals = async (req, res) => {
  const { sortBy = 'startDate', order = 'asc', page, limit } = req.query;

  const sortField = SORT_FIELDS.has(sortBy) ? sortBy : 'startDate';
  const sortOrder = order === 'desc' ? -1 : 1;

  try {
    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;
      const [festivals, total] = await Promise.all([
        Festival.find().sort({ [sortField]: sortOrder }).skip(skip).limit(limitNum),
        Festival.countDocuments(),
      ]);

      return res.json({
        data: festivals.map(mapFestival),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    const festivals = await Festival.find().sort({ [sortField]: sortOrder });
    res.json(festivals.map(mapFestival));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/festivals/:id
exports.getFestivalById = async (req, res) => {
  try {
    const festival = await Festival.findById(req.params.id);
    if (!festival) return res.status(404).json({ message: 'Festival not found.' });
    res.json(mapFestival(festival));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/festivals
exports.createFestival = async (req, res) => {
  const { name, startDate, endDate, location, genre, capacity, description, imageUrl } = req.body;

  const parsedStartDate = parseDateOrNull(startDate);
  const parsedEndDate = parseDateOrNull(endDate);

  if (!name || !parsedStartDate || !parsedEndDate || !location) {
    return res
      .status(400)
      .json({ message: 'name, startDate, endDate, and location are required.' });
  }

  if (parsedEndDate < parsedStartDate) {
    return res
      .status(400)
      .json({ message: 'The end date must be on or after the start date.' });
  }

  try {
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
    const saved = await festival.save();
    res.status(201).json(mapFestival(saved));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/festivals/:id — full replacement
exports.replaceFestival = async (req, res) => {
  const { name, startDate, endDate, location, genre, capacity, description, imageUrl } = req.body;

  const parsedStartDate = parseDateOrNull(startDate);
  const parsedEndDate = parseDateOrNull(endDate);

  if (!name || !parsedStartDate || !parsedEndDate || !location) {
    return res
      .status(400)
      .json({ message: 'name, startDate, endDate, and location are required.' });
  }
  if (parsedEndDate < parsedStartDate) {
    return res.status(400).json({ message: 'The end date must be on or after the start date.' });
  }

  try {
    const replacement = {
      name,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      location,
      genre: genre ?? '',
      capacity: typeof capacity === 'number' ? capacity : 0,
      description: description ?? '',
      imageUrl: imageUrl ?? '',
    };

    const festival = await Festival.findOneAndReplace(
      { _id: req.params.id },
      replacement,
      { new: true, runValidators: true }
    );
    if (!festival) return res.status(404).json({ message: 'Festival not found.' });
    res.json(mapFestival(festival));
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

    if (updates.startDate) {
      const parsed = parseDateOrNull(updates.startDate);
      if (!parsed) return res.status(400).json({ message: 'Invalid startDate.' });
      updates.startDate = parsed;
    }

    if (updates.endDate) {
      const parsed = parseDateOrNull(updates.endDate);
      if (!parsed) return res.status(400).json({ message: 'Invalid endDate.' });
      updates.endDate = parsed;
    }

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
    res.json(mapFestival(updatedFestival));
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

    await Promise.all([
      Stage.deleteMany({ festival: festival._id }),
      Performance.deleteMany({ festival: festival._id }),
    ]);

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
