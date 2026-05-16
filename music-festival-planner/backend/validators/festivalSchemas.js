const Joi = require('joi');

// Accept either a date string or a JS Date object so API clients have flexibility in how they send dates.
const dateField = Joi.alternatives()
  .try(Joi.string().min(1), Joi.date())
  .messages({ 'alternatives.match': '{{#label}} must be a valid date string' });

// Reusable field rules shared between the create and update schemas to avoid repetition.
const festivalFields = {
  // Festival title — trimmed and capped to keep display names readable.
  name: Joi.string().trim().min(1).max(200),
  // When the festival begins; accepts strings or Date objects.
  startDate: dateField,
  // When the festival ends; accepts strings or Date objects.
  endDate: dateField,
  // City or region where the festival takes place.
  location: Joi.string().trim().min(1).max(200),
  // Optional music genre label for browsing filters.
  genre: Joi.string().trim().allow('').max(100),
  // Optional total attendee capacity — must be a whole number and non-negative.
  capacity: Joi.number().integer().min(0),
  // Optional summary text shown on detail and card views.
  description: Joi.string().trim().allow('').max(2000),
  // Optional hero image URL — must be an absolute URL if provided.
  imageUrl: Joi.string().uri({ allowRelative: false }).allow('').max(500),
};

// Enforces required fields when creating a brand-new festival.
const createFestivalSchema = Joi.object({
  // Name, dates, and location are mandatory to create a meaningful festival record.
  name: festivalFields.name.required(),
  startDate: festivalFields.startDate.required(),
  endDate: festivalFields.endDate.required(),
  location: festivalFields.location.required(),
  // Remaining fields are optional extras.
  genre: festivalFields.genre,
  capacity: festivalFields.capacity,
  description: festivalFields.description,
  imageUrl: festivalFields.imageUrl,
});

// All fields optional for PATCH — at least one must be provided.
const updateFestivalSchema = Joi.object({
  // Any subset of fields can be patched; the .min(1) call below rejects empty bodies.
  name: festivalFields.name,
  startDate: festivalFields.startDate,
  endDate: festivalFields.endDate,
  location: festivalFields.location,
  genre: festivalFields.genre,
  capacity: festivalFields.capacity,
  description: festivalFields.description,
  imageUrl: festivalFields.imageUrl,
  // Require at least one field so callers cannot send a no-op PATCH request.
}).min(1);

// Export both schemas so festival route handlers can pick the right one per HTTP method.
module.exports = { createFestivalSchema, updateFestivalSchema };
