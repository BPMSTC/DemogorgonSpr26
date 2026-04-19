const express = require('express');
const router = express.Router();
const controller = require('../controllers/stageController');
const validate = require('../middleware/validate');
const { createStageSchema, replaceStageSchema } = require('../validators/stageSchemas');

router.get('/', controller.getStagesByFestival);
router.post('/', validate(createStageSchema), controller.createStage);

// NOTE: /festival/:festivalId must be declared BEFORE /:id so Express doesn't
// match the literal string "festival" as a stage ID.
router.delete('/festival/:festivalId', controller.deleteStagesByFestival);
router.put('/:id', validate(replaceStageSchema), controller.replaceStage);
router.delete('/:id', controller.deleteStage);

module.exports = router;
