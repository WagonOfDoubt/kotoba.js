/**
 * Errors module
 * @module errors
 */

const { BaseError } = require('./base-error');
const { AuthRequiredError, PermissionDeniedError } = require('./permission-error');
const { DocumentAlreadyExistsError, DocumentNotFoundError, DocumentNotModifiedError } = require('./document-error');
const { RequestValidationError } = require('./validation-error');
const { FileAlreadyExistsError, FileFormatNotSupportedError, ThumbnailGenerationError } = require('./file-error');
const { CaptchaEntryNotFoundError, IncorrectCaptchaError } = require('./captcha-error');
const { PostingError } = require('./posting-error');

/**
 * @see module:errors/base-error.BaseError
 */
module.exports.BaseError = BaseError;
/**
 * @see module:errors/permission-error.AuthRequiredError
 */
module.exports.AuthRequiredError = AuthRequiredError;
/**
 * @see module:errors/permission-error.PermissionDeniedError
 */
module.exports.PermissionDeniedError = PermissionDeniedError;
/**
 * @see module:errors/document-error.DocumentAlreadyExistsError
 */
module.exports.DocumentAlreadyExistsError = DocumentAlreadyExistsError;
/**
 * @see module:errors/document-error.DocumentNotFoundError
 */
module.exports.DocumentNotFoundError = DocumentNotFoundError;
/**
 * @see module:errors/document-error.DocumentNotModifiedError
 */
module.exports.DocumentNotModifiedError = DocumentNotModifiedError;
/**
 * @see module:errors/validation-error.RequestValidationError
 */
module.exports.RequestValidationError = RequestValidationError;
/**
 * @see module:errors/file-error.FileAlreadyExistsError
 */
module.exports.FileAlreadyExistsError = FileAlreadyExistsError;
/**
 * @see module:errors/file-error.FileFormatNotSupportedError
 */
module.exports.FileFormatNotSupportedError = FileFormatNotSupportedError;
/**
 * @see module:errors/file-error.ThumbnailGenerationError
 */
module.exports.ThumbnailGenerationError = ThumbnailGenerationError;
/**
 * @see module:errors/captcha-error.CaptchaEntryNotFoundError
 */
module.exports.CaptchaEntryNotFoundError = CaptchaEntryNotFoundError;
/**
 * @see module:errors/captcha-error.IncorrectCaptchaError
 */
module.exports.IncorrectCaptchaError = IncorrectCaptchaError;
/**
 * @see module:errors/posting-error.PostingError
 */
module.exports.PostingError = PostingError;
