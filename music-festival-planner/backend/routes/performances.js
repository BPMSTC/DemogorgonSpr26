const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/performanceController');

router.get('/',    controller.getPerformancesByFestival);
router.post('/',   controller.createPerformance);

// NOTE: /festival/:festivalId must be declared BEFORE /:id.
router.delete('/festival/:festivalId', controller.deletePerformancesByFestival);
router.put('/:id',                     controller.replacePerformance);
router.delete('/:id',                  controller.deletePerformance);

module.exports = router;
