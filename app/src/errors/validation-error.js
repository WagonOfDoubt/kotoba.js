/**
 * Validation errors
 * @module errors/validation-error
 */

const { BadRequestError } = require('./base-error');


/**
 * @apiDefine RequestValidationError
 * @apiError RequestValidation Request did not pass validation
 * @apiErrorExample RequestValidation
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "status": 400,
 *       "error": {
 *         "message": "Invalid value",
 *         "code": "RequestValidation",
 *         "param": "foo",
 *         "value": 42,
 *         "location": "body"
 *       }
 *     }
 */


/**
 * Request did not pass validation
 */
class RequestValidationError extends BadRequestError {
  constructor(message, param, value, location) {
    super(message, 'RequestValidation', param, value, location);
  }

  /**
   * Convert express-validator error to RequestValidationError
   * @static
   * @param  {Object} error express-validator error object
   * @return {RequestValidationError}
   */
  static fromExpressValidator({ msg, param, value, location }) {
    return new RequestValidationError(msg, param, value, location);
  }
}


module.exports.RequestValidationError = RequestValidationError;
