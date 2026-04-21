const express = require('express');
const router = express.Router();
const controller = require('../controllers/festivalController');
const validate = require('../middleware/validate');
const { createFestivalSchema, updateFestivalSchema } = require('../validators/festivalSchemas');

router.get('/', controller.getAllFestivals);
router.get('/:id', controller.getFestivalById);
router.post('/', validate(createFestivalSchema), controller.createFestival);
router.put('/:id', validate(createFestivalSchema), controller.replaceFestival);
router.patch('/:id', validate(updateFestivalSchema), controller.updateFestival);
router.delete('/:id', controller.deleteFestival);

module.exports = router;
