const { validationResult } = require('express-validator/check');

/**
 * Middleware that returns 400 status and JSON response with express-validator
 * errors object, if there are any errors.
 */
module.exports.validateRequest = (req, res, next) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      const errors = result.array();
      errors.forEach(e => e.type = 'RequestValidationError');
      if (errors.length === 1) {
        return res.status(400).json({ error: errors[0] });
      } else {
        return res.status(400).json({ errors: errors });
      }
    }
    next();
  } catch (errorWhileProcessingError) {
    next(errorWhileProcessingError);
  }
};


/**
 * Create middleware that redirects to specific url if express-validator results
 * is not empty.
 * @param {string} redirect - uri to redirect to
 * @returns Middleware function that redirects to said url if validationResult
 * is not empty
 */
module.exports.validateRedirect = (redirect) =>
  (req, res, next) => {
    try {
      if (validationResult(req).isEmpty()) {
        next();
      } else {
        return res.redirect(redirect);
      }
    } catch (errorWhileProcessingError) {
      next(errorWhileProcessingError);
    }
  };
