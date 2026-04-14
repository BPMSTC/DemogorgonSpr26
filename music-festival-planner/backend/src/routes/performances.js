const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');

// ---- Time helpers ----------------------------------------------------------

function toMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time || '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

// Returns true if the new slot overlaps any existing performance on the same
// stage/date (excluding an optional performance ID for edit scenarios).
async function isStageOccupied(festivalId, stageName, date, startTime, endTime, excludeId) {
  const newStart = toMinutes(startTime);
  const newEnd   = toMinutes(endTime);
  if (newStart === null || newEnd === null || newStart >= newEnd) return false;

  const query = { festivalId, stageName, date };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await Performance.find(query);
  return existing.some((p) => {
    const s = toMinutes(p.startTime);
    const e = toMinutes(p.endTime);
    if (s === null || e === null) return false;
    return newStart < e && newEnd > s;
  });
}

// ----------------------------------------------------------------------------

// GET /api/performances?festivalId=<id>
// Returns all performances for a given festival, sorted by date then start time.
router.get('/', async (req, res) => {
  const { festivalId } = req.query;
  if (!festivalId) {
    return res.status(400).json({ message: 'festivalId query parameter is required.' });
  }
  try {
    const performances = await Performance.find({ festivalId }).sort({
      date: 1,
      startTime: 1,
    });
    res.json(performances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/performances
// Creates a new performance with time-conflict validation.
router.post('/', async (req, res) => {
  const { festivalId, artistName, stageName, date, startTime, endTime, genre } = req.body;

  const startMinutes = toMinutes(startTime);
  const endMinutes   = toMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return res.status(400).json({
      message: 'Start and end times must be valid 24-hour times (H:mm or HH:mm).',
    });
  }
  if (startMinutes >= endMinutes) {
    return res.status(400).json({ message: 'End time must be later than start time.' });
  }

  try {
    const conflict = await isStageOccupied(festivalId, stageName, date, startTime, endTime);
    if (conflict) {
      return res.status(409).json({
        message: `"${stageName}" is already booked during that time slot.`,
      });
    }

    const performance = new Performance({
      festivalId,
      artistName,
      stageName,
      date,
      startTime,
      endTime,
      genre,
    });
    const saved = await performance.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/performances/festival/:festivalId
// Deletes ALL performances for a festival (used in cascade delete).
// IMPORTANT: must be declared BEFORE /:id to prevent "festival" matching as id.
router.delete('/festival/:festivalId', async (req, res) => {
  try {
    await Performance.deleteMany({ festivalId: req.params.festivalId });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/performances/:id
// Deletes a single performance by its MongoDB ID.
router.delete('/:id', async (req, res) => {
  try {
    const performance = await Performance.findByIdAndDelete(req.params.id);
    if (!performance) return res.status(404).json({ message: 'Performance not found.' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
