const express = require('express');
const router = express.Router();
const controller = require('../controllers/performanceController');
const validate = require('../middleware/validate');
const { createPerformanceSchema, replacePerformanceSchema } = require('../validators/performanceSchemas');

router.get('/', controller.getPerformancesByFestival);
router.post('/', validate(createPerformanceSchema), controller.createPerformance);

// NOTE: /festival/:festivalId must be declared BEFORE /:id.
router.delete('/festival/:festivalId', controller.deletePerformancesByFestival);
router.put('/:id', validate(replacePerformanceSchema), controller.replacePerformance);
router.delete('/:id', controller.deletePerformance);

module.exports = router;
