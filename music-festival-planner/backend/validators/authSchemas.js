const Joi = require('joi');

// Rules for creating a new account — both fields are required and the password must meet a minimum length.
const registerSchema = Joi.object({
  // Must be a properly formatted email address; stored lowercase to keep comparisons consistent.
  email: Joi.string().email().lowercase().trim().required(),
  // Enforce a minimum length so trivially weak passwords are rejected at the API boundary.
  password: Joi.string().min(8).max(128).required(),
});

// Rules for logging in — password length is not re-enforced here since we just need something to compare.
const loginSchema = Joi.object({
  // Same email normalisation as registration so the lookup always finds the right user.
  email: Joi.string().email().lowercase().trim().required(),
  // Accept any non-empty string so the bcrypt comparison can determine correctness.
  password: Joi.string().required(),
});

// Export both schemas so route handlers can pick the one that matches the request type.
module.exports = { registerSchema, loginSchema };
