/**
 * File errors
 * @module errors/file-error
 */

const { ConflictError, UnsupportedMediaTypeError, PayloadTooLargeError } = require('./base-error');


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
 * @extends module:errors/base-error.ConflictError
 * @alias module:errors/file-error.FileAlreadyExistsError
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
 * @extends module:errors/base-error.UnsupportedMediaTypeError
 * @alias module:errors/file-error.FileFormatNotSupportedError
 */
class FileFormatNotSupportedError extends UnsupportedMediaTypeError {
  constructor(param, value, location) {
    super(`File type ${value} not supported for this upload`,
      'FileFormatNotSupported', param, value, location);
  }
}


/**
 * @apiDefine ThumbnailGenerationError
 * @apiError ThumbnailGenerationError Attempt to upload file that already exists
 * @apiErrorExample ThumbnailGenerationError
 *     HTTP/1.1 409 Conflict
 *     {
 *       "status": 409,
 *       "error": {
 *         "code": "ThumbnailGenerationError",
 *         "message": "Unable to generate thumbnail for media file. File may be corrupt or have unsupported format or codec",
 *       }
 *     }
 */

/**
 * Error occurred during thumbnail creation
 * @extends module:errors/base-error.UnsupportedMediaTypeError
 * @alias module:errors/file-error.ThumbnailGenerationError
 */
class ThumbnailGenerationError extends UnsupportedMediaTypeError {
  constructor(param, value, location) {
    super(`Unable to generate thumbnail for media file. File may be corrupt or have unsupported format or codec.`,
      'FileFormatNotSupported', param, value, location);
  }
}


/**
 * @apiDefine FileTooLargeError
 * @apiError FileTooLargeError File
 * @apiErrorExample FileTooLargeError
 *     HTTP/1.1 413 Payload Too Large
 *     {
 *       "status": 413,
 *       "error": {
 *         "code": "FileTooLarge",
 *         "message": "File size is too big",
 *       }
 *     }
 */

/**
 * Error occurred during thumbnail creation
 * @extends module:errors/base-error.PayloadTooLargeError
 * @alias module:errors/file-error.FileTooLargeError
 */
class FileTooLargeError extends UnsupportedMediaTypeError {
  constructor(param, value, location) {
    super(`File size is too big`,
      'FileTooLarge', param, value, location);
  }
}


module.exports.FileAlreadyExistsError = FileAlreadyExistsError;
module.exports.FileFormatNotSupportedError = FileFormatNotSupportedError;
module.exports.ThumbnailGenerationError = ThumbnailGenerationError;
module.exports.FileTooLargeError = FileTooLargeError;
