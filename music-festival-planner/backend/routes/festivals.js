// Express router and the pieces needed to handle festival-related requests.
const express = require('express');
// Create a mini-router that will be mounted at /api/festivals in server.js.
const router = express.Router();
// Functions that read and write festival data in the database.
const controller = require('../controllers/festivalController');
// Middleware that rejects requests whose body does not match a schema.
const validate = require('../middleware/validate');
// The body shapes required when creating or partially updating a festival.
const { createFestivalSchema, updateFestivalSchema } = require('../validators/festivalSchemas');

// Return every festival stored in the database.
router.get('/', controller.getAllFestivals);
// Return a single festival matched by its unique ID.
router.get('/:id', controller.getFestivalById);
// Create a brand-new festival after validating the full creation payload.
router.post('/', validate(createFestivalSchema), controller.createFestival);
// Replace every field of an existing festival with the validated incoming data.
router.put('/:id', validate(createFestivalSchema), controller.replaceFestival);
// Apply a partial update to an existing festival using only the fields provided.
router.patch('/:id', validate(updateFestivalSchema), controller.updateFestival);
// Permanently remove a festival from the database by its ID.
router.delete('/:id', controller.deleteFestival);

// Hand this router to server.js so it gets mounted at the right path.
module.exports = router;
