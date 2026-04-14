const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/stageController');

router.get('/',    controller.getStagesByFestival);
router.post('/',   controller.createStage);

// NOTE: /festival/:festivalId must be declared BEFORE /:id so Express doesn't
// match the literal string "festival" as a stage ID.
router.delete('/festival/:festivalId', controller.deleteStagesByFestival);
router.delete('/:id',                  controller.deleteStage);

module.exports = router;
