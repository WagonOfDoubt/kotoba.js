/**
 * Permission errors
 * @module errors/permission-error
 */

const { UnauthorizedError, ForbiddenError } = require('./base-error');


/**
 * @apiDefine AuthRequiredError
 * @apiError AuthRequired User is not authenticated
 * @apiErrorExample AuthRequired
 *     HTTP/1.1 401 Unauthorized
 *     {
 *       "status": 401,
 *       "error": {
 *         "message": "User must be logged in to perform this action",
 *         "code": "AuthRequired"
 *       }
 *     }
 */


/**
 * Error that thrown if user is not logged in
 * @extends module:errors/base-error.UnauthorizedError
 * @alias module:errors/permission-error.AuthRequiredError
 */
class AuthRequiredError extends UnauthorizedError {
  constructor() {
    super(`User must be logged in to perform this action`, 'AuthRequired');
  }
}


/**
 * @apiDefine PermissionDeniedError
 * @apiError PermissionDenied User don't have necessary permission
 * @apiErrorExample PermissionDenied
 *     HTTP/1.1 403 Forbidden
 *     {
 *       "status": 403,
 *       "error": {
 *         "message": "User don't have rights to perform this action",
 *         "code": "PermissionDenied"
 *       }
 *     }
 */

/**
 * User don't have necessary permission
 * @extends module:errors/base-error.ForbiddenError
 * @alias module:errors/permission-error.PermissionDeniedError
 */
class PermissionDeniedError extends ForbiddenError {
  constructor() {
    super(`User don't have rights to perform this action`, 'PermissionDenied');
  }
}


module.exports.AuthRequiredError = AuthRequiredError;
module.exports.PermissionDeniedError = PermissionDeniedError;
