const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/festivalController');

router.get('/',     controller.getAllFestivals);
router.get('/:id',  controller.getFestivalById);
router.post('/',    controller.createFestival);
router.patch('/:id', controller.updateFestival);
router.delete('/:id', controller.deleteFestival);

module.exports = router;
