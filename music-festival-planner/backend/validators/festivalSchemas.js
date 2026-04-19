const Joi = require('joi');

const dateField = Joi.alternatives()
  .try(Joi.string().min(1), Joi.date())
  .messages({ 'alternatives.match': '{{#label}} must be a valid date string' });

const festivalFields = {
  name: Joi.string().trim().min(1).max(200),
  startDate: dateField,
  endDate: dateField,
  location: Joi.string().trim().min(1).max(200),
  genre: Joi.string().trim().allow('').max(100),
  capacity: Joi.number().integer().min(0),
  description: Joi.string().trim().allow('').max(2000),
  imageUrl: Joi.string().uri({ allowRelative: false }).allow('').max(500),
};

const createFestivalSchema = Joi.object({
  name: festivalFields.name.required(),
  startDate: festivalFields.startDate.required(),
  endDate: festivalFields.endDate.required(),
  location: festivalFields.location.required(),
  genre: festivalFields.genre,
  capacity: festivalFields.capacity,
  description: festivalFields.description,
  imageUrl: festivalFields.imageUrl,
});

// All fields optional for PATCH — at least one must be provided.
const updateFestivalSchema = Joi.object({
  name: festivalFields.name,
  startDate: festivalFields.startDate,
  endDate: festivalFields.endDate,
  location: festivalFields.location,
  genre: festivalFields.genre,
  capacity: festivalFields.capacity,
  description: festivalFields.description,
  imageUrl: festivalFields.imageUrl,
}).min(1);

module.exports = { createFestivalSchema, updateFestivalSchema };
