/**
 * Document errors
 * @module errors/document-error
 */

const { ConflictError, NotFoundError, NoContentError } = require('./base-error');

/**
 * @apiDefine DocumentAlreadyExistsError
 * @apiError DocumentAlreadyExists Attempt to create document that already exists
 * @apiErrorExample BoardAlreadyExists
 *     HTTP/1.1 409 Conflict
 *     {
 *       "status": 409,
 *       "error": {
 *         "code": "DocumentAlreadyExists",
 *         "message": "Board \"b\" already exists",
 *         "param": "data.uri",
 *         "value": "b",
 *         "location": "body"
 *       }
 *     }
 */

/**
 * Attempt to create document that already exists
 */
class DocumentAlreadyExistsError extends ConflictError {
  constructor(documentName, param, value, location) {
    super(`${documentName} "${value}" already exists`,
      'DocumentAlreadyExists', param, value, location);
  }
}


/**
 * @apiDefine DocumentNotFoundError
 * @apiError DocumentNotFound Document was not found
 *
 * @apiErrorExample DocumentNotFound
 *     HTTP/1.1 404 Not Found
 *     {
 *       "status": 404,
 *       "error": {
 *         "code": "DocumentNotFound",
 *         "message": "Board \"foo\" not found",
 *         "param": "uri",
 *         "value": "foo",
 *         "location": "params",
 *       }
 *     }
 */

/**
 * Document was not found
 */
class DocumentNotFoundError extends NotFoundError {
  constructor(documentName, param, value, location) {
    super(`${documentName} "${value}" not found`,
      'DocumentNotFound', param, value, location);
  }
}


/**
 * Document was not modified because it's already in that state
 */
class DocumentNotModifiedError extends NoContentError {
  constructor(documentName, param, value, location) {
    super(`${documentName} was not modified`,
      'DocumentNotModified', param, value, location);
  }
}


module.exports.DocumentAlreadyExistsError = DocumentAlreadyExistsError;
module.exports.DocumentNotFoundError = DocumentNotFoundError;
module.exports.DocumentNotModifiedError = DocumentNotModifiedError;
