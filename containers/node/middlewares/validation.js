const { validationResult } = require('express-validator/check');

/**
 * Middleware that returns 422 status and JSON response with express-validator
 * errors object, if there are any errors.
 */
module.exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
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
    if (validationResult(req).isEmpty()) {
      next();
    } else {
      return res.redirect(redirect);
    }
  };
