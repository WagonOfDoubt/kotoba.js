/**
 * Errors module
 * @module errors
 */

const baseError       = require('./base-error');
const permissionError = require('./permission-error');
const documentError   = require('./document-error');
const validationError = require('./validation-error');
const fileError       = require('./file-error');
const captchaError    = require('./captcha-error');
const postingError    = require('./posting-error');

/**
 * @see module:errors/base-error.BaseError
 */
module.exports.BaseError                   = baseError.BaseError;
/**
 * @see module:errors/permission-error.AuthRequiredError
 */
module.exports.AuthRequiredError           = permissionError.AuthRequiredError;
/**
 * @see module:errors/permission-error.PermissionDeniedError
 */
module.exports.PermissionDeniedError       = permissionError.PermissionDeniedError;
/**
 * @see module:errors/document-error.DocumentAlreadyExistsError
 */
module.exports.DocumentAlreadyExistsError  = documentError.DocumentAlreadyExistsError;
/**
 * @see module:errors/document-error.DocumentNotFoundError
 */
module.exports.DocumentNotFoundError       = documentError.DocumentNotFoundError;
/**
 * @see module:errors/document-error.DocumentNotModifiedError
 */
module.exports.DocumentNotModifiedError    = documentError.DocumentNotModifiedError;
/**
 * @see module:errors/validation-error.RequestValidationError
 */
module.exports.RequestValidationError      = validationError.RequestValidationError;
/**
 * @see module:errors/file-error.FileAlreadyExistsError
 */
module.exports.FileAlreadyExistsError      = fileError.FileAlreadyExistsError;
/**
 * @see module:errors/file-error.FileFormatNotSupportedError
 */
module.exports.FileFormatNotSupportedError = fileError.FileFormatNotSupportedError;
/**
 * @see module:errors/file-error.ThumbnailGenerationError
 */
module.exports.ThumbnailGenerationError    = fileError.ThumbnailGenerationError;
/**
 * @see module:errors/file-error.FileTooLargeError
 */
module.exports.FileTooLargeError           = fileError.FileTooLargeError;
/**
 * @see module:errors/captcha-error.CaptchaEntryNotFoundError
 */
module.exports.CaptchaEntryNotFoundError   = captchaError.CaptchaEntryNotFoundError;
/**
 * @see module:errors/captcha-error.IncorrectCaptchaError
 */
module.exports.IncorrectCaptchaError       = captchaError.IncorrectCaptchaError;
/**
 * @see module:errors/posting-error.PostingError
 */
module.exports.PostingError                = postingError.PostingError;
