/**
 * Captcha errors
 * @module errors/captcha-error
 */

const { UnprocessableEntityError } = require('./base-error');

/**
 * @apiDefine CaptchaEntryNotFoundError
 * @apiError CaptchaEntryNotFound Captcha for this session not found on server - it probably timed out
 * @apiErrorExample CaptchaEntryNotFound
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "status": 422,
 *       "error": {
 *         "code": "CaptchaEntryNotFound",
 *         "message": "Captcha for this session not found on server - it probably timed out",
 *         "param": "captcha",
 *         "value": "fgsfds",
 *         "location": "body"
 *       }
 *     }
 */

/**
 * No captcha for session found on server. It either expired or was newer
 *    requested.
 * @extends module:errors/base-error.UnprocessableEntityError
 * @alias module:errors/captcha-error.CaptchaEntryNotFoundError
 */
class CaptchaEntryNotFoundError extends UnprocessableEntityError {
  constructor(param, value, location) {
    super(`Captcha for this session not found on server - it probably timed out`,
      'CaptchaEntryNotFound', param, value, location);
  }
}


/**
 * @apiDefine IncorrectCaptchaError
 * @apiError IncorrectCaptchaError Wrong captcha entered
 * @apiErrorExample IncorrectCaptchaError
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "status": 422,
 *       "error": {
 *         "code": "IncorrectCaptchaError",
 *         "message": "Wrong captcha entered",
 *         "param": "captcha",
 *         "value": "fgsfds",
 *         "location": "body"
 *       }
 *     }
 */

/**
 * Captcha entered by user does not match the answer
 * @extends module:errors/base-error.UnprocessableEntityError
 * @alias module:errors/captcha-error.CaptchaEntryNotFoundError
 */
class IncorrectCaptchaError extends UnprocessableEntityError {
  constructor(param, value, location) {
    super(`Wrong captcha entered`,
      'IncorrectCaptcha', param, value, location);
  }
}


module.exports.CaptchaEntryNotFoundError = CaptchaEntryNotFoundError;
module.exports.IncorrectCaptchaError = IncorrectCaptchaError;
