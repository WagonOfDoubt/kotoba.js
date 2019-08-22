/**
 * Errors module
 * @module errors
 */

const { BaseError } = require('./base-error');
const { AuthRequiredError, PermissionDeniedError } = require('./permission-error');
const { DocumentAlreadyExistsError, DocumentNotFoundError, DocumentNotModifiedError } = require('./document-error');
const { RequestValidationError } = require('./validation-error');
const { FileAlreadyExistsError, FileFormatNotSupportedError } = require('./file-error');

module.exports.BaseError = BaseError;
module.exports.AuthRequiredError = AuthRequiredError;
module.exports.PermissionDeniedError = PermissionDeniedError;
module.exports.DocumentAlreadyExistsError = DocumentAlreadyExistsError;
module.exports.DocumentNotFoundError = DocumentNotFoundError;
module.exports.DocumentNotModifiedError = DocumentNotModifiedError;
module.exports.RequestValidationError = RequestValidationError;
module.exports.FileAlreadyExistsError = FileAlreadyExistsError;
module.exports.FileFormatNotSupportedError = FileFormatNotSupportedError;
