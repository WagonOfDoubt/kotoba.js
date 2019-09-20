/**
 * Wakaba captcha generator
 * @module wakabtcha
 */

module.exports.generateImage = require('./lib/image-generator').generate;
module.exports.generateAnswer = require('./lib/answer-generator').generate;
