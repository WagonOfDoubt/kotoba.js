/**
 * Validation errors
 * @module errors/validation-error
 */

const { BadRequestError } = require('./base-error');


/**
 * @apiDefine PostingError
 * @apiError PostingError Post entry has missing or invalid fields
 * @apiErrorExample RequestValidation
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "status": 400,
 *       "error": {
 *         "message": "New threads must contain message",
 *         "code": "PostingError",
 *         "param": "message",
 *         "value": "",
 *         "location": "body"
 *       }
 *     }
 */


/**
 * Post entry has missing or invalid fields
 * @extends module:errors/base-error.BadRequestError
 * @alias module:errors/posting-error.PostingError
 */
class PostingError extends BadRequestError {
  constructor(message, param, value, location) {
    super(message, 'PostingError', param, value, location);
  }
}


module.exports.PostingError = PostingError;
