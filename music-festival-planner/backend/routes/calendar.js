const express = require('express');

const controller = require('../controllers/calendarController');

const router = express.Router();

router.get('/auth', controller.startCalendarAuth);
router.get('/callback', controller.handleCalendarCallback);

module.exports = router;