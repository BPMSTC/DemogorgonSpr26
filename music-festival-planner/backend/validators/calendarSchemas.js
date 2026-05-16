const Joi = require('joi');

// Validates the query parameters sent when a user starts the Google Calendar OAuth flow.
const authCalendarQuerySchema = Joi.object({
  // Comma-separated list of performance IDs the user wants to export to their calendar.
  performanceIds: Joi.string().trim().min(1).required(),
  // Stable browser-side identifier that links this OAuth session back to the correct token record.
  deviceUserId: Joi.string()
    .trim()
    // Restrict to URL-safe characters to avoid injection issues in the signed state parameter.
    .pattern(/^[A-Za-z0-9_-]{8,128}$/)
    .required(),
  // IANA timezone string used to schedule events in the user's local time.
  timezone: Joi.string().trim().min(1).max(100).required(),
});

// Validates the query parameters Google sends back to the callback URL after the user grants access.
const calendarCallbackQuerySchema = Joi.object({
  // One-time authorisation code exchanged for OAuth tokens.
  code: Joi.string().trim().required(),
  // Signed state token we issued earlier — verified to prevent CSRF attacks.
  state: Joi.string().trim().required(),
});

// Export both schemas so the calendar route handlers can validate their respective endpoints.
module.exports = {
  authCalendarQuerySchema,
  calendarCallbackQuerySchema,
};
