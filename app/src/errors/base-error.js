/**
 * Module contains abstract error class
 * @module errors/base-error
 */
const _ = require('lodash');

/**
 * Base error class
 * @extends Error
 * @alias module:errors/base-error.BaseError
 */
class BaseError extends Error {
  /**
   * Create error
   * @param  {String} message  Error message
   * @param  {String} code     Error identifier
   * @param  {String} status   HTTP status code related to error
   * @param  {String} param    Name of request parameter that triggered error
   * @param  {*}      value    Value of request parameter that triggered error
   * @param  {String} location Location of parameter in request (body, params,
   *    query, cookies)
   */
  constructor(message, code, status, param, value, location) {
    super(message);
    this.code = code || 'UnknownError';
    this._status = status || 418;
    this._param = param || null;
    this._value = value || null;
    this._location = location || null;
  }

  /**
   * Convert Error to plain Object
   * @return {Object} Object with fields { code, message, param, value,
   *    location }
   */
  toObject() {
    const obj = {};
    if (this.code) {
      obj.code = this.code;
    }
    if (this.message) {
      obj.message = this.message;
    }
    if (this._param) {
      obj.param = this._param;
    }
    if (this._value) {
      obj.value = this._value;
    }
    if (this._location) {
      obj.location = this._location;
    }
    return obj;
  }

  /**
   * Same as #toObject, but static method
   * @static
   * @param  {BaseError} error Error to covert
   * @return {Object}          Object with fields { code, message, param,
   *    value, location }
   */
  static convertToObject(error) {
    return error.toObject();
  }

  /**
   * Convert error to Object with fields { status, error }
   * @return {Object}
   */
  toResponse() {
    return {
      status: this._status,
      error: this.toObject(),
    };
  }

  /**
   * Same as #toResponse, but static method
   * @static
   * @param  {BaseError} error Error to covert
   * @return {Object}          Object with fields { status, error }
   */
  static convertToResponse(error) {
    return error.toResponse();
  }

  /**
   * HTTP status related to error
   * @return {?number}
   */
  get status() {
    return this._status || null;
  }

  set status(value) {
    this._status = value;
  }

  /**
   * Name of parameter that triggered error
   * @return {?String}
   */
  get param() {
    return this._param || null;
  }

  set param(value) {
    this._param = value;
  }

  /**
   * Value of parameter that triggered error
   * @return {*}
   */
  get value() {
    return this._value;
  }

  set value(value) {
    this._value = value;
  }

  /**
   * Location of parameter that triggered error ("body", "params", "cookies"
   *    or "query")
   * @return {String}
   */
  get location() {
    return this._location || null;
  }

  set location(value) {
    this._location = value;
  }

  /**
   * Assign status and error for each object in array
   * @param  {Object[]} array Source array
   * @param  {String=}  valueField name of field to assign as value for each
   *    error
   * @return {Object[]}       Array where each object has additional error and
   *    status fields
   * @example
   * const notFoundItems = [{ id: 265 }, { id: 228 }];
   * const notFoundError = new BaseError('Post not found', 'DocumentNotFoundError', 404);
   * const errors = notFoundError.assignToArray(notFoundItems, 'id');
   * // errors:
   * [
   *   {
   *     id: 265,
   *     status: 404,
   *     error: {
   *       code: 'DocumentNotFoundError',
   *       message: 'Post not found',
   *       value: 265
   *     }
   *   },
   *   {
   *     id: 228,
   *     status: 404,
   *     error: {
   *       code: 'DocumentNotFoundError',
   *       message: 'Post not found',
   *       value: 228
   *     }
   *   }
   * ]
   */
  assignToArray(array, valueField) {
    return array.map((item) => {
      const resp = this.toResponse();
      if (valueField) {
        resp.error.value = _.get(item, valueField);
      }
      return Object.assign(item, resp);
    });
  }

  /**
   * Respond to client with error JSON and related to error HTTP status
   * @param {http.ServerResponse} res Express Response object
   */
  respond(res) {
    return res
      .status(this._status)
      .json({
        status: this._status,
        error: this.toObject(),
      });
  }
}


/**
 * Generic "400 Bad Request" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.BadRequestError
 */
class BadRequestError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'BadRequest', 400, param, value, location);
  }
}


/**
 * Generic "401 Unauthorized" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.UnauthorizedError
 */
class UnauthorizedError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'Unauthorized', 401, param, value, location);
  }
}


/**
 * Generic "403 Forbidden" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.ForbiddenError
 */
class ForbiddenError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'Forbidden', 403, param, value, location);
  }
}


/**
 * Generic "404 Not Found" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.NotFoundError
 */
class NotFoundError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'NotFound', 404, param, value, location);
  }
}


/**
 * @apiDefine ConflictError
 * @apiError ConflictError Request could not be processed because of conflict
 *
 * @apiErrorExample DocumentNotFound
 *     HTTP/1.1 409 Conflict
 *     {
 *       "status": 409,
 *       "error": {
 *         "code": "Conflict",
 *         "message": "This role is currently assigned 10 times. Revoke role from all users before deleting it.",
 *         "param": "roleName",
 *         "value": "moderator",
 *         "location": "body",
 *       }
 *     }
 */

/**
 * Generic "409 Conflict" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.ConflictError
 */
class ConflictError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'Conflict', 409, param, value, location);
  }
}


/**
 * Generic "413 Payload Too Large" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.PayloadTooLargeError
 */
class PayloadTooLargeError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'PayloadTooLarge', 413, param, value, location);
  }
}


/**
 * Generic "415 Unsupported Media Type" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.UnsupportedMediaTypeError
 */
class UnsupportedMediaTypeError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'UnsupportedMediaType', 415, param, value, location);
  }
}


/**
 * Generic "422 Unprocessable Entity" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.UnprocessableEntityError
 */
class UnprocessableEntityError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'UnprocessableEntity', 422, param, value, location);
  }
}


/**
 * Generic "429 Too Many Requests" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.TooManyRequestsError
 */
class TooManyRequestsError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'TooManyRequests', 429, param, value, location);
  }
}


/**
 * Generic "204 No Content" Error
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.NoContentError
 */
class NoContentError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'NoContent', 204, param, value, location);
  }
}


/**
 * Generic "500 Internal Server Error"
 * @extends module:errors/base-error.BaseError
 * @alias module:errors/base-error.UnknownError
 */
class UnknownError extends BaseError {
  constructor(message, code, param, value, location) {
    super(message, code || 'UnknownError', 500, param, value, location);
  }
}


module.exports.BaseError = BaseError;
module.exports.BadRequestError = BadRequestError;
module.exports.UnauthorizedError = UnauthorizedError;
module.exports.ForbiddenError = ForbiddenError;
module.exports.NotFoundError = NotFoundError;
module.exports.ConflictError = ConflictError;
module.exports.PayloadTooLargeError = PayloadTooLargeError;
module.exports.UnsupportedMediaTypeError = UnsupportedMediaTypeError;
module.exports.UnprocessableEntityError = UnprocessableEntityError;
module.exports.TooManyRequestsError = TooManyRequestsError;
module.exports.NoContentError = NoContentError;
module.exports.UnknownError = UnknownError;
