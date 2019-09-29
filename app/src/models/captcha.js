/**
 * Mongoose model for captcha tokens
 * @module models/captcha
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Captcha Mongoose model
 * @class Captcha
 * @extends external:Model
 */
const captchaSchema = Schema({
  /**
   * User's session id
   * @type {String}
   * @memberof module:models/captcha~Captcha
   * @instance
   */
  session: { type: String, required: true },
  /**
   * Captcha key in format "{reply|thread}.{boardUri}" i.e.: "reply.b",
   *    "thread.a". Indexed.
   * @type {String}
   * @memberof module:models/captcha~Captcha
   * @instance
   */
  key: { type: String, required: true },
  /**
   * Captcha answer. Indexed.
   * @type {String}
   * @memberof module:models/captcha~Captcha
   * @instance
   */
  answer: { type: String, required: true },
  /**
   * Date when captcha token will be deleted from database. Expiration is
   *    handled by MongoDB itself.
   * @type {Date}
   * @memberof module:models/captcha~Captcha
   * @instance
   */
  expireAt: { type: Date, index: { expireAfterSeconds: 0 } },
  /**
   * Whether or not user already solved this challenge
   * @type {Boolean}
   * @memberof module:models/captcha~Captcha
   * @instance
   */
  isSolved: { type: Boolean, default: false },
});


captchaSchema.index({ session: 1, key: 1 });


/**
 * Serialize action and boardUri into single string
 * @param  {String} action   Action, i.e. "reply" or "thread"
 * @param  {String} boardUri Board, i.e. "b"
 * @return {String}          Key, i.e. "reply.b"
 */
const toKey = (action, boardUri) => `${action}.${boardUri}`;


/**
 * Get Date in future that is N minutes from now
 * @param  {Number} minutes How many minutes passed
 * @return {Date}           Date N minutes from now
 */
const advanceMinutes = (minutes) => {
  const now = new Date();
  return new Date(now.getTime() + minutes * 60000);
};


/**
 * @typedef  {Object} CaptchaStatusObject
 * @property {Boolean} isSolved Whether or not user already solved this challenge
 * @property {Date} expireAt Captcha expiration date
 * @property {Number} key Captcha key
 */


/**
 * Create new captcha entry for session or refresh expiration time on
 *    existing. Expire time will not be changed if captcha is solved.
 * @param  {String} answer            Captcha answer
 * @param  {String} sessionId         User's session id
 * @param  {String} action            Action, i.e. "reply" or "thread"
 * @param  {String} boardUri          Board, i.e. "b"
 * @param  {Number} expireAfterMinutes Number of minutes until captcha will
 *    expire
 * @return {Promise.<?CaptchaStatusObject>} Frozen object or null
 * @alias module:models/captcha.refresh
 */
const refreshCaptcha = (answer, sessionId, action, boardUri, expireAfterMinutes) => {
  answer = answer.toLowerCase();
  const key = toKey(action, boardUri);
  const expireAt = advanceMinutes(expireAfterMinutes);

  const isNotSolvedCondition = { $eq: ['$isSolved', false] };

  return Captcha.collection.findOneAndUpdate(
    {
      session: sessionId,
      key: key,
    },
    [
      {
        $set: {
          isSolved: { $ifNull: ['$isSolved', false] },
        },
      },
      {
        $set: {
          expireAt: {
            $cond: {
              if: isNotSolvedCondition,
              then: expireAt,
              else: '$expireAt',
            }
          },
          answer: {
            $cond: {
              if: isNotSolvedCondition,
              then: answer,
              else: '$answer',
            }
          },
        },
      },
    ],
    {
      upsert: true,
      projection: {isSolved: 1, expireAt: 1, key: 1, _id: 0},
      returnOriginal: false,
    }
  ).then(result => {
    if (result.value) {
      return Object.freeze(result.value);
    } else {
      return null;
    }
  });
};


/**
 * Create new captcha entry for session or refresh expiration time on
 *    existing. Expire time will not be changed if captcha is solved.
 * @param  {String} answer            Captcha answer
 * @param  {String} sessionId         User's session id
 * @param  {String} action            Action, i.e. "reply" or "thread"
 * @param  {String} boardUri          Board, i.e. "b"
 * @param  {Number} expireAfterMinutes Number of minutes until captcha will
 *    expire
 * @return {Promise.<?CaptchaStatusObject>} Frozen object or null
 * @alias module:models/captcha.validate
 */
const validateCaptcha = (answer, sessionId, action, boardUri, expireAfterMinutes) => {
  answer = answer.toLowerCase();
  const key = toKey(action, boardUri);
  const expireAt = advanceMinutes(expireAfterMinutes);

  const isCorrectCondition = { $eq: ['$answer', answer] };

  return Captcha.collection.findOneAndUpdate(
    {
      session: sessionId,
      key: key,
    },
    [
      {
        $set: {
          isSolved: {
            $cond: {
              if: isCorrectCondition,
              then: true,
              else: '$isSolved',
            }
          },
          expireAt: {
            $cond: {
              if: isCorrectCondition,
              then: expireAt,
              else: '$expireAt',
            }
          },
        },
      },
    ],
    {
      projection: {isSolved: 1, expireAt: 1, key: 1, _id: 0},
      returnOriginal: false,
    }
  ).then(result => {
    if (result.value) {
      return Object.freeze(result.value);
    } else {
      return null;
    }
  });
};


/**
 * Check if captcha is already solved without updating it
 * @param  {String} answer            Captcha answer
 * @param  {String} sessionId         User's session id
 * @param  {String} Action            Action, i.e. "reply" or "thread"
 * @param  {String} boardUri          Board, i.e. "b"
 * @param  {Number} expireAfterMinutes Number of minutes until captcha will
 *    expire
 * @return {Promise.<?CaptchaStatusObject>} Frozen object or null
 * @example await Captcha.lookup(req.session.id, action, boardUri);
 * =>
 * {
 *   isSolved: false,
 *   expireAt: "2007-01-01T02:55:42.228Z",
 *   key: "reply.b"
 * }
* @alias module:models/captcha.lookup
 */
const lookupCaptcha = (sessionId, action, boardUri) => {
  const key = toKey(action, boardUri);
  return Captcha.findOne({
      session: sessionId,
      key: key,
    })
    .select({isSolved: 1, expireAt: 1, key: 1, _id: 0})
    .then((result) => {
      if (result) {
        return Object.freeze(result.toObject());
      }
      return result;
    });
};


const Captcha = mongoose.model('Captcha', captchaSchema);

module.exports = Object.freeze({
  refresh: refreshCaptcha,
  validate: validateCaptcha,
  lookup: lookupCaptcha,
});
