// Custom error class used to pass structured validation failures to the error handler.
const AppError = require('./AppError');

// Build a middleware function that checks the request body against a given Joi schema.
function validate(schema) {
  // Return the actual middleware so it can be dropped into any route definition.
  return (req, res, next) => {
    // Run the schema check, collecting all failures at once and stripping unknown fields.
    const { error, value } = schema.validate(req.body, {
      // Report every broken field rather than stopping at the first one.
      abortEarly: false,
      // Remove any fields the caller sent that are not defined in the schema.
      stripUnknown: true,
    });
    // If the body did not pass the rules, build a list of problem descriptions.
    if (error) {
      // Turn each Joi detail into a simple field/message pair for the caller.
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      // Send the failure list to the central error handler instead of proceeding.
      return next(new AppError('Validation failed', 400, errors));
    }
    // Replace the raw request body with the cleaned, schema-validated version.
    req.body = value;
    // Everything looks good — let the route handler take over.
    next();
  };
}

// Export the factory so routes can call validate(someSchema) inline.
module.exports = validate;
