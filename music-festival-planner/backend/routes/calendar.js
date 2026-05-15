// Express and the calendar controller that talks to the Google Calendar API.
const express = require('express');

// Functions that handle the OAuth handshake with Google Calendar.
const controller = require('../controllers/calendarController');

// Create a router that will be mounted at /api/calendar in server.js.
const router = express.Router();

// Send the user to Google to grant calendar access.
router.get('/auth', controller.startCalendarAuth);
// Handle the redirect Google sends back after the user approves access.
router.get('/callback', controller.handleCalendarCallback);

// Share this router so it can be registered with the main app.
module.exports = router;
