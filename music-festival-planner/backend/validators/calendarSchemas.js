const Joi = require('joi');

const authCalendarQuerySchema = Joi.object({
  performanceIds: Joi.string().trim().min(1).required(),
  deviceUserId: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9_-]{8,128}$/)
    .required(),
  timezone: Joi.string().trim().min(1).max(100).required(),
});

const calendarCallbackQuerySchema = Joi.object({
  code: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
});

module.exports = {
  authCalendarQuerySchema,
  calendarCallbackQuerySchema,
};