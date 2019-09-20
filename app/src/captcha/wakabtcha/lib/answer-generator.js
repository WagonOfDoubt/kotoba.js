/**
 * Module that generates answers (random strings) for captcha challenge.
 * This file is port of original wakaba source code.
 * @module wakabtcha/lib/answer-generator
 * @see [captcha.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/master/captcha.pl}
 */


/**
 * Grammar object for L-system. L-system starts with axiom string, that acts
 *    as a template. This object describes rules of L-system. All substrings
 *    enclosed in % symbols (e.g. "%W%") are recursively replaced by random
 *    string from array from this object's field where key matches substring.
 * @example
 * "%W%" => "%C%%T%" => "l%V%%F%" => "lock"
 * @see [wiki:L-system]{@link https://en.wikipedia.org/wiki/L-system}
 * @type {Object.<String,String[]>}
 * @access package
 */
const DEFAULT_GRAMMAR = {
  'W': ['%C%%T%', '%C%%T%', '%C%%X%', '%C%%D%%F%', '%C%%V%%F%%T%', '%C%%D%%F%%U%', '%C%%T%%U%', '%I%%T%', '%I%%C%%T%', '%A%'],
  'A': ['%K%%V%%K%%V%tion'],
  'K': ['b', 'c', 'd', 'f', 'g', 'j', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 's%P%'],
  'I': ['ex', 'in', 'un', 're', 'de'],
  'T': ['%V%%F%', '%V%%E%e'],
  'U': ['er', 'ish', 'ly', 'en', 'ing', 'ness', 'ment', 'able', 'ive'],
  'C': ['b', 'c', 'ch', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 'sh', 't', 'th', 'v', 'w', 'y', 's%P%', '%R%r', '%L%l'],
  'E': ['b', 'c', 'ch', 'd', 'f', 'g', 'dg', 'l', 'm', 'n', 'p', 'r', 's', 't', 'th', 'v', 'z'],
  'F': ['b', 'tch', 'd', 'ff', 'g', 'gh', 'ck', 'll', 'm', 'n', 'n', 'ng', 'p', 'r', 'ss', 'sh', 't', 'tt', 'th', 'x', 'y', 'zz', 'r%R%', 's%P%', 'l%L%'],
  'P': ['p', 't', 'k', 'c'],
  'Q': ['b', 'd', 'g'],
  'L': ['b', 'f', 'k', 'p', 's'],
  'R': ['%P%', '%Q%', 'f', 'th', 'sh'],
  'V': ['a', 'e', 'i', 'o', 'u'],
  'D': ['aw', 'ei', 'ow', 'ou', 'ie', 'ea', 'ai', 'oy'],
  'X': ['e', 'i', 'o', 'aw', 'ow', 'oy']
};


/**
 * Generate string based on L-system described by grammar object
 * This method is direct port from wakautils.pl
 * @see [wakautils.pl source]{@link https://github.com/some1suspicious/wakaba-original/blob/b71c8df40a70ab654c420f4e42a51aa5e6d7a158/wakautils.pl#L823}
 * @param  {String} str     Starting string
 * @param  {Object} grammar Grammar object
 * @return {String}         Resulting string
 */
const cfg_expand = (str, grammar) => {
  const re = /\%(\w+)\%/;
  const matches = str.match(re);
  if (matches && matches[1]) {
    const key = matches[1];
    const expansions = grammar[key];
    const sample = expansions[Math.floor(Math.random() * expansions.length)];
    str = str.replace(re, sample);
    str = cfg_expand(str, grammar);
  }
  return str;
};


/**
 * Generate random string
 * @param {String} [start='%W%'] Starting template
 * @param {Object.<String,String[]>} [grammar=DEFAULT_GRAMMAR] Grammar object
 * @return {String} Random string
 * @alias module:wakabtcha.generateAnswer
 * @see {@link module:wakabtcha/lib/answer-generator~DEFAULT_GRAMMAR}
 */
module.exports.generate = (start = '%W%', grammar = DEFAULT_GRAMMAR) => {
  return cfg_expand(start, grammar);
};
