/**
 * Helper functions related to regularExpressions
 * @module utils/regexp
 */

const _ = require('lodash');


/**
 * Create regular expression that matches any string that in array, like
 * array.includes, but with RegExp.
 * Also allows for placeholder $[n] that will match any digits in resulting
 * expression (replaced with \d+).
 * @example
 * const fooRegExp = createRegExpFromArray(['foo', 'bar', 'baz.1.abc']);
 * // ^(foo|bar|baz\.\d+\.abc)$
 * @param {Array.<string>} array - array of strings
 * @returns {RegExp}
 */
module.exports.createRegExpFromArray = (array) => {
  const digitsPlaceholder = _.escapeRegExp('$[n]');
  const escapeStr = (path) => _.escapeRegExp(path).replace(digitsPlaceholder, '\\d+');
  const matches = array.map(escapeStr);
  const regExp = new RegExp(`^(${ matches.join('|') })$`);
  return regExp;
};


/**
 * Creates a new function that calls regExp.test
 * @param {RegEx} regExp - regular expression
 * @returns {function} (str) => regExp.test(str)
 */
module.exports.regExpTester = (regExp) => RegExp.prototype.test.bind(regExp);
