const mongoose = require('mongoose');
const Performance = require('../models/performance');
const Stage = require('../models/stage');
const Artist = require('../models/artist');
const AppError = require('../middleware/AppError');

const PERF_SORT_FIELDS = new Set(['date', 'startTime', 'endTime', 'artistName', 'stageName', 'genre']);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function toMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function toDateOnly(value) {
  if (!value) return '';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '';
  return dateValue.toISOString().slice(0, 10);
}

function toTimeOnly(value) {
  if (!value) return '';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '';
  return dateValue.toISOString().slice(11, 16);
}

function buildUtcDate(dateText, timeText) {
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec((timeText || '').trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText)) || !timeMatch) {
    return null;
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const isoValue = `${dateText}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function mapPerformance(doc) {
  const stageName = typeof doc.stage === 'object' && doc.stage?.name ? doc.stage.name : '';
  const artistName = typeof doc.artist === 'object' && doc.artist?.name ? doc.artist.name : '';

  return {
    id: doc._id.toString(),
    festivalId: doc.festival.toString(),
    artistName,
    stageName,
    date: toDateOnly(doc.startDateTime),
    startTime: toTimeOnly(doc.startDateTime),
    endTime: toTimeOnly(doc.endDateTime),
    genre: doc.genre || (typeof doc.artist === 'object' ? doc.artist?.genre : undefined),
  };
}

async function resolveStage(festivalId, stageName) {
  const normalizedStageName = normalizeName(stageName);

  return Stage.findOne({
    festival: festivalId,
    name: { $regex: new RegExp(`^${escapeRegex(normalizedStageName)}$`, 'i') },
  });
}

async function resolveArtist(artistName, genre) {
  const normalizedArtistName = normalizeName(artistName);
  const existing = await Artist.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalizedArtistName)}$`, 'i') },
  });

  if (existing) {
    if (!existing.genre && genre) {
      existing.genre = genre;
      await existing.save();
    }
    return existing;
  }

  const artist = new Artist({
    name: normalizedArtistName,
    genre: genre || 'Unknown',
    description: '',
  });
  return artist.save();
}

async function isStageOccupied(festivalId, stageId, startDateTime, endDateTime, excludeId) {
  const query = {
    festival: festivalId,
    stage: stageId,
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const conflict = await Performance.exists(query);
  return Boolean(conflict);
}

function sortPerformances(items, sortBy = 'date', order = 'asc') {
  const direction = order === 'desc' ? -1 : 1;
  const field = PERF_SORT_FIELDS.has(sortBy) ? sortBy : 'date';

  const sorted = [...items].sort((a, b) => {
    const left = a[field] ?? '';
    const right = b[field] ?? '';

    if (field === 'startTime' || field === 'endTime') {
      const leftMinutes = toMinutes(left) ?? 0;
      const rightMinutes = toMinutes(right) ?? 0;
      return (leftMinutes - rightMinutes) * direction;
    }

    return String(left).localeCompare(String(right)) * direction;
  });

  if (field === 'date') {
    sorted.sort((a, b) => {
      if (a.date === b.date) {
        return ((toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0)) * direction;
      }
      return a.date.localeCompare(b.date) * direction;
    });
  }

  return sorted;
}

// GET /api/performances?festivalId=<id>
// Optional: &sortBy=date&order=asc&page=1&limit=20
exports.getPerformancesByFestival = async (req, res, next) => {
  const { festivalId, sortBy = 'date', order = 'asc', page, limit } = req.query;
  if (!festivalId) {
    return next(new AppError('festivalId query parameter is required.', 400));
  }
  if (!mongoose.isValidObjectId(festivalId)) {
    return next(new AppError('festivalId must be a valid ObjectId.', 400));
  }

  try {
    const docs = await Performance.find({ festival: festivalId })
      .populate('artist', 'name genre')
      .populate('stage', 'name')
      .sort({ startDateTime: 1 });

    const sorted = sortPerformances(docs.map(mapPerformance), sortBy, order);

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
      const start = (pageNum - 1) * limitNum;
      const data = sorted.slice(start, start + limitNum);

      return res.json({
        data,
        total: sorted.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(sorted.length / limitNum),
      });
    }

    res.json(sorted);
  } catch (err) {
    next(err);
  }
};

// POST /api/performances
exports.createPerformance = async (req, res, next) => {
  const { festivalId, artistName, stageName, date, startTime, endTime, genre } = req.body;

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return next(new AppError('Start and end times must be valid 24-hour times (H:mm or HH:mm).', 400));
  }
  if (startMinutes >= endMinutes) {
    return next(new AppError('End time must be later than start time.', 400));
  }

  const startDateTime = buildUtcDate(date, startTime);
  const endDateTime = buildUtcDate(date, endTime);
  if (!startDateTime || !endDateTime) {
    return next(new AppError('date must be in YYYY-MM-DD format.', 400));
  }

  try {
    const stage = await resolveStage(festivalId, stageName);
    if (!stage) {
      return next(new AppError(`Stage "${stageName}" was not found for this festival.`, 400));
    }

    const conflict = await isStageOccupied(festivalId, stage._id, startDateTime, endDateTime);
    if (conflict) {
      return next(new AppError(`"${stageName}" is already booked during that time slot.`, 409));
    }

    const artist = await resolveArtist(artistName, genre);

    const performance = new Performance({
      festival: festivalId,
      artist: artist._id,
      stage: stage._id,
      startDateTime,
      endDateTime,
      genre: genre || artist.genre || '',
    });

    const saved = await performance.save();
    const hydrated = await Performance.findById(saved._id)
      .populate('artist', 'name genre')
      .populate('stage', 'name');

    res.status(201).json(mapPerformance(hydrated));
  } catch (err) {
    next(err);
  }
};

// PUT /api/performances/:id — full replacement (festival reference is immutable)
exports.replacePerformance = async (req, res, next) => {
  const { artistName, stageName, date, startTime, endTime, genre } = req.body;

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return next(new AppError('Start and end times must be valid 24-hour times (H:mm or HH:mm).', 400));
  }
  if (startMinutes >= endMinutes) {
    return next(new AppError('End time must be later than start time.', 400));
  }

  const startDateTime = buildUtcDate(date, startTime);
  const endDateTime = buildUtcDate(date, endTime);
  if (!startDateTime || !endDateTime) {
    return next(new AppError('date must be in YYYY-MM-DD format.', 400));
  }

  try {
    const existing = await Performance.findById(req.params.id);
    if (!existing) return next(new AppError('Performance not found.', 404));

    const stage = await resolveStage(existing.festival, stageName);
    if (!stage) {
      return next(new AppError(`Stage "${stageName}" was not found for this festival.`, 400));
    }

    const conflict = await isStageOccupied(
      existing.festival,
      stage._id,
      startDateTime,
      endDateTime,
      req.params.id
    );
    if (conflict) {
      return next(new AppError(`"${stageName}" is already booked during that time slot.`, 409));
    }

    const artist = await resolveArtist(artistName, genre);

    existing.artist = artist._id;
    existing.stage = stage._id;
    existing.startDateTime = startDateTime;
    existing.endDateTime = endDateTime;
    existing.genre = genre || artist.genre || '';

    await existing.save();

    const hydrated = await Performance.findById(existing._id)
      .populate('artist', 'name genre')
      .populate('stage', 'name');

    res.json(mapPerformance(hydrated));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/performances/festival/:festivalId
// Deletes ALL performances for a festival (cascade delete helper).
exports.deletePerformancesByFestival = async (req, res, next) => {
  try {
    await Performance.deleteMany({ festival: req.params.festivalId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// DELETE /api/performances/:id
exports.deletePerformance = async (req, res, next) => {
  try {
    const performance = await Performance.findByIdAndDelete(req.params.id);
    if (!performance) return next(new AppError('Performance not found.', 404));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
