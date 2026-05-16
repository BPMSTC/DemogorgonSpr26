const Joi = require('joi');

// Reusable rule for MongoDB ObjectId strings — must be exactly 24 hex characters.
const objectIdField = Joi.string().hex().length(24).messages({
  'string.hex': '{{#label}} must be a valid ObjectId',
  'string.length': '{{#label}} must be a valid ObjectId',
});

// Matches a calendar date with no time component (e.g. "2026-07-18").
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
// Matches a 24-hour clock time with optional leading zero on the hour (e.g. "9:30" or "21:00").
const timePattern = /^\d{1,2}:\d{2}$/;

// Reusable field rules shared between the create and replace schemas.
const performanceFields = {
  // Name of the artist performing — resolved to an ObjectId by the controller.
  artistName: Joi.string().trim().min(1).max(200),
  // Name of the stage hosting the set — resolved to an ObjectId by the controller.
  stageName: Joi.string().trim().min(1).max(100),
  // Calendar date of the performance in ISO format.
  date: Joi.string()
    .pattern(datePattern)
    .messages({ 'string.pattern.base': '{{#label}} must be in YYYY-MM-DD format' }),
  // Time when the set begins; combined with date to form a full datetime.
  startTime: Joi.string()
    .pattern(timePattern)
    .messages({ 'string.pattern.base': '{{#label}} must be in H:mm or HH:mm format' }),
  // Time when the set ends; must be later than startTime (enforced in the model).
  endTime: Joi.string()
    .pattern(timePattern)
    .messages({ 'string.pattern.base': '{{#label}} must be in H:mm or HH:mm format' }),
  // Optional genre tag carried with the performance for filtering convenience.
  genre: Joi.string().trim().allow('').max(100),
};

// Validates the body when adding a new performance — all key fields are required, including the parent festival.
const createPerformanceSchema = Joi.object({
  // Which festival this performance belongs to — supplied as the string form of a MongoDB ObjectId.
  festivalId: objectIdField.required(),
  artistName: performanceFields.artistName.required(),
  stageName: performanceFields.stageName.required(),
  date: performanceFields.date.required(),
  startTime: performanceFields.startTime.required(),
  endTime: performanceFields.endTime.required(),
  // Genre is optional on creation.
  genre: performanceFields.genre,
});

// Validates a full replacement (PUT) — festivalId comes from the URL, not the body, so it is excluded here.
const replacePerformanceSchema = Joi.object({
  artistName: performanceFields.artistName.required(),
  stageName: performanceFields.stageName.required(),
  date: performanceFields.date.required(),
  startTime: performanceFields.startTime.required(),
  endTime: performanceFields.endTime.required(),
  // Genre is optional on replacement as well.
  genre: performanceFields.genre,
});

// Export both schemas so performance route handlers can pick the right one per HTTP method.
module.exports = { createPerformanceSchema, replacePerformanceSchema };
