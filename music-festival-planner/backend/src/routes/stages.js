const express = require('express');
const router = express.Router();
const Stage = require('../models/Stage');

// GET /api/stages?festivalId=<id>
// Returns all stages for a given festival.
router.get('/', async (req, res) => {
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
});

// POST /api/stages
// Creates a new stage.
router.post('/', async (req, res) => {
  const { festivalId, name, capacity, environment, status, notes } = req.body;

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return res.status(400).json({ message: 'capacity must be a positive integer.' });
  }

  // Stage names must be unique within a festival (case-insensitive).
  try {
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
});

// DELETE /api/stages/festival/:festivalId
// Deletes ALL stages for a festival (used in cascade delete).
// IMPORTANT: this route must be declared BEFORE /:id to avoid "festival" being
// matched as an id parameter.
router.delete('/festival/:festivalId', async (req, res) => {
  try {
    await Stage.deleteMany({ festivalId: req.params.festivalId });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/stages/:id
// Deletes a single stage by its MongoDB ID.
router.delete('/:id', async (req, res) => {
  try {
    const stage = await Stage.findByIdAndDelete(req.params.id);
    if (!stage) return res.status(404).json({ message: 'Stage not found.' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
