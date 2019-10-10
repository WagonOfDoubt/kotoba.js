/**
 * Middlewares for request validation
 * @module middlewares/validation
 */

const { validationResult, matchedData } = require('express-validator');
const { RequestValidationError } = require('../errors');


/**
 * Replaces req.body with matchedData() form express-validator
 * @see {@link https://express-validator.github.io/docs/matched-data-api.html}
 * @static
 */
module.exports.filterMatched = (req, res, next) => {
  req.body = matchedData(req, { includeOptionals: true, locations: ['body'] });
  next();
};


/**
 * Middleware that returns 400 status and JSON response with express-validator
 * errors object, if there are any errors.
 * @see {@link https://express-validator.github.io/docs/}
 * @static
 */
module.exports.validateRequest = (req, res, next) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      const errors = result
        .formatWith(RequestValidationError.fromExpressValidator)
        .array()
        .map(e => e.toObject());
      if (errors.length === 1) {
        return res.status(400).json({ status: 400, error: errors[0] });
      } else {
        return res.status(400).json({ status: 400, errors: errors });
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
 * @see  {@link https://express-validator.github.io/docs/}
 * @static
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
