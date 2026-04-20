const Joi = require('joi');

const objectIdField = Joi.string()
  .hex()
  .length(24)
  .messages({
    'string.hex': '{{#label}} must be a valid ObjectId',
    'string.length': '{{#label}} must be a valid ObjectId',
  });

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{1,2}:\d{2}$/;

const performanceFields = {
  artistName: Joi.string().trim().min(1).max(200),
  stageName: Joi.string().trim().min(1).max(100),
  date: Joi.string()
    .pattern(datePattern)
    .messages({ 'string.pattern.base': '{{#label}} must be in YYYY-MM-DD format' }),
  startTime: Joi.string()
    .pattern(timePattern)
    .messages({ 'string.pattern.base': '{{#label}} must be in H:mm or HH:mm format' }),
  endTime: Joi.string()
    .pattern(timePattern)
    .messages({ 'string.pattern.base': '{{#label}} must be in H:mm or HH:mm format' }),
  genre: Joi.string().trim().allow('').max(100),
};

const createPerformanceSchema = Joi.object({
  festivalId: objectIdField.required(),
  artistName: performanceFields.artistName.required(),
  stageName: performanceFields.stageName.required(),
  date: performanceFields.date.required(),
  startTime: performanceFields.startTime.required(),
  endTime: performanceFields.endTime.required(),
  genre: performanceFields.genre,
});

const replacePerformanceSchema = Joi.object({
  artistName: performanceFields.artistName.required(),
  stageName: performanceFields.stageName.required(),
  date: performanceFields.date.required(),
  startTime: performanceFields.startTime.required(),
  endTime: performanceFields.endTime.required(),
  genre: performanceFields.genre,
});

module.exports = { createPerformanceSchema, replacePerformanceSchema };
