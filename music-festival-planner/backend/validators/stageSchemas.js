const Joi = require('joi');

// Reusable rule for MongoDB ObjectId strings — must be exactly 24 hex characters.
const objectIdField = Joi.string().hex().length(24).messages({
  'string.hex': '{{#label}} must be a valid ObjectId',
  'string.length': '{{#label}} must be a valid ObjectId',
});

// Reusable field rules shared between the create and replace schemas.
const stageFields = {
  // Display name for the stage shown in schedule and management views.
  name: Joi.string().trim().min(1).max(100),
  // Realistic crowd capacity — kept within a sensible range for festival venues.
  capacity: Joi.number().integer().min(100).max(200000),
  // Physical setting of the stage, used for UI badges and filtering.
  environment: Joi.string().valid('indoor', 'outdoor', 'tent', 'club'),
  // Operational state of the stage at the time of the event.
  status: Joi.string().valid('active', 'inactive', 'under-repair'),
  // Free-text admin notes about the stage (e.g. special setup requirements).
  notes: Joi.string().trim().allow('').max(1000),
};

// Validates the body when adding a new stage — name, capacity, and parent festival are all required.
const createStageSchema = Joi.object({
  // Which festival owns this stage — supplied as the string form of a MongoDB ObjectId.
  festivalId: objectIdField.required(),
  name: stageFields.name.required(),
  capacity: stageFields.capacity.required(),
  // Environment, status, and notes default on the model when not provided.
  environment: stageFields.environment,
  status: stageFields.status,
  notes: stageFields.notes,
});

// Validates a full replacement (PUT) — festivalId comes from the URL so it is excluded from the body.
const replaceStageSchema = Joi.object({
  name: stageFields.name.required(),
  capacity: stageFields.capacity.required(),
  // Optional fields remain optional during replacement.
  environment: stageFields.environment,
  status: stageFields.status,
  notes: stageFields.notes,
});

// Export both schemas so stage route handlers can pick the right one per HTTP method.
module.exports = { createStageSchema, replaceStageSchema };
