const AppError = require('./AppError');

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new AppError('Validation failed', 400, errors));
    }
    req.body = value;
    next();
  };
}

module.exports = validate;
