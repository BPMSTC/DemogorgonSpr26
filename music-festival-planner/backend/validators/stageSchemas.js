const Joi = require('joi');

const objectIdField = Joi.string()
  .hex()
  .length(24)
  .messages({
    'string.hex': '{{#label}} must be a valid ObjectId',
    'string.length': '{{#label}} must be a valid ObjectId',
  });

const stageFields = {
  name: Joi.string().trim().min(1).max(100),
  capacity: Joi.number().integer().min(100).max(200000),
  environment: Joi.string().valid('indoor', 'outdoor', 'tent', 'club'),
  status: Joi.string().valid('active', 'inactive', 'under-repair'),
  notes: Joi.string().trim().allow('').max(1000),
};

const createStageSchema = Joi.object({
  festivalId: objectIdField.required(),
  name: stageFields.name.required(),
  capacity: stageFields.capacity.required(),
  environment: stageFields.environment,
  status: stageFields.status,
  notes: stageFields.notes,
});

const replaceStageSchema = Joi.object({
  name: stageFields.name.required(),
  capacity: stageFields.capacity.required(),
  environment: stageFields.environment,
  status: stageFields.status,
  notes: stageFields.notes,
});

module.exports = { createStageSchema, replaceStageSchema };
