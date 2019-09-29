/**
 * All captcha providers
 * @module captcha
 */

const wakabtcha = require('./wakabtcha');


/**
 * @typedef {Object} CaptchaProvider
 * @property {function():String} generateAnswer Function that returns random
 *    string that serves as answer to challenge
 * @property {function(String):Buffer} generateImage Function that generates
 *    image based on challenge string
 * @property {String} mimeType Mime type of resulting file from generateImage
 *    function
 */

const captchaProviders = Object.freeze({
  /**
   * Classic Wakaba captcha provider
   * @see  {@link https://github.com/WagonOfDoubt/wakabtcha.js}
   * @type {CaptchaProvider}
   * @alias module:captcha.wakabtcha
   */
  wakabtcha: Object.freeze({
    generateAnswer: () => wakabtcha.generateAnswer(),
    generateImage: (str) => wakabtcha.generateImage(str),
    mimeType: 'image/gif',
  }),
});


module.exports = captchaProviders;
