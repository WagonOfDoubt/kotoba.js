/**
 * File errors
 * @module errors/file-error
 */

const { ConflictError, UnsupportedMediaTypeError } = require('./base-error');


/**
 * @apiDefine FileAlreadyExistsError
 * @apiError FileAlreadyExists Attempt to upload file that already exists
 * @apiErrorExample FileAlreadyExists
 *     HTTP/1.1 409 Conflict
 *     {
 *       "status": 409,
 *       "error": {
 *         "code": "FileAlreadyExists",
 *         "message": "File with hash "..." already exists",
 *         "param": "files",
 *         "value": "...",
 *         "location": "body"
 *       }
 *     }
 */

/**
 * Attempt to upload file that already exists
 */
class FileAlreadyExistsError extends ConflictError {
  constructor(param, value, location) {
    super(`File with hash ${value} already exists`,
      'FileAlreadyExists', param, value, location);
  }
}


/**
 * @apiDefine FileFormatNotSupportedError
 * @apiError FileFormatNotSupported Attempt to upload file that already exists
 * @apiErrorExample FileFormatNotSupported
 *     HTTP/1.1 409 Conflict
 *     {
 *       "status": 409,
 *       "error": {
 *         "code": "FileFormatNotSupported",
 *         "message": "File type ".rar" not supported for this upload",
 *         "param": "files",
 *         "value": ".rar",
 *         "location": "body"
 *       }
 *     }
 */

/**
 * Attempt to upload file that already exists
 */
class FileFormatNotSupportedError extends UnsupportedMediaTypeError {
  constructor(param, value, location) {
    super(`File type ${value} not supported for this upload`,
      'FileFormatNotSupported', param, value, location);
  }
}


module.exports.FileAlreadyExistsError = FileAlreadyExistsError;
module.exports.FileFormatNotSupportedError = FileFormatNotSupportedError;
