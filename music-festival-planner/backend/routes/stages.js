// Express router and the pieces needed to handle stage-related requests.
const express = require('express');
// Create a mini-router that will be mounted at /api/stages in server.js.
const router = express.Router();
// Functions that read and write stage data in the database.
const controller = require('../controllers/stageController');
// Middleware that rejects requests whose body does not match the expected shape.
const validate = require('../middleware/validate');
// The body shapes required when creating or fully replacing a stage.
const { createStageSchema, replaceStageSchema } = require('../validators/stageSchemas');

// Return all stages that belong to a specific festival.
router.get('/', controller.getStagesByFestival);
// Add a new stage after making sure the submitted data is valid.
router.post('/', validate(createStageSchema), controller.createStage);

// NOTE: /festival/:festivalId must be declared BEFORE /:id so Express doesn't
// match the literal string "festival" as a stage ID.
// Remove every stage tied to a given festival in one go.
router.delete('/festival/:festivalId', controller.deleteStagesByFestival);
// Swap out all fields on a single stage with the fully validated replacement.
router.put('/:id', validate(replaceStageSchema), controller.replaceStage);
// Permanently delete a single stage by its unique ID.
router.delete('/:id', controller.deleteStage);

// Share this router so it can be registered with the main app.
module.exports = router;
