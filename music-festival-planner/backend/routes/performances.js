// Express router and the pieces needed to handle performance-related requests.
const express = require('express');
// Create a mini-router that will be mounted at /api/performances in server.js.
const router = express.Router();
// Functions that read and write performance data in the database.
const controller = require('../controllers/performanceController');
// Middleware that rejects requests whose body does not match the expected shape.
const validate = require('../middleware/validate');
// The body shapes required when creating or fully replacing a performance.
const { createPerformanceSchema, replacePerformanceSchema } = require('../validators/performanceSchemas');

// Return all performances that belong to a specific festival.
router.get('/', controller.getPerformancesByFestival);
// Add a new performance after making sure the submitted data is valid.
router.post('/', validate(createPerformanceSchema), controller.createPerformance);

// NOTE: /festival/:festivalId must be declared BEFORE /:id.
// Remove every performance tied to a given festival in one go.
router.delete('/festival/:festivalId', controller.deletePerformancesByFestival);
// Swap out all fields on a single performance with the fully validated replacement.
router.put('/:id', validate(replacePerformanceSchema), controller.replacePerformance);
// Permanently delete a single performance by its unique ID.
router.delete('/:id', controller.deletePerformance);

// Share this router so it can be registered with the main app.
module.exports = router;
