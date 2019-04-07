/**
 * Functions for pug templates and string formatting
 * @module utils/filters
 */

const path = require('path');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: true });
const flatten = require('flat');

const filters = {};


/**
 * Render text in markdown
 * @param  {String} text    Text to format
 * @param  {Object} options Filter options (not used)
 * @return {String}         Formatted HTML
 */
filters.markdown = (text, options) => {
  return md.render(text);
};


const evalPath = (o, x) =>
  (typeof o == 'undefined' || o === null) ? o : o[x];


filters.getPath = (key, obj) => {
  return obj && key.split('.').reduce(evalPath, obj);
};


/**
 * Get object property value by path of keys
 * @param  {String} key Path to property (keys separated with dots or enclosed
 *    in square brackets)
 * @param  {Object} obj Source object
 * @return {Any}        Property value
 * @example
 * getPath('foo.bar.baz', obj);
 * getPath('foo[bar][baz]', obj);
 */
filters.getParam = (key, obj) => {
  return obj && key
    .split(/[\[\]\.]/)
    .filter(s => s !== '')
    .reduce(evalPath, obj);
};


/**
 * Flatten nested objects into an object that is one level deep
 * @param  {Object} obj source object
 * @return {Object}     Flatten object
 */
filters.flatObj = (obj) => flatten(obj);


/**
 * Convert bytes to readable size, depending of value (kilobytes, megabytes,
 *    etc.)
 * @param  {String} text    Size in bytes (must be a number)
 * @param  {Object} options Filter options (not used)
 * @return {String}         Formatted size
 * @example
 * readableSize("12492")  // => "12.19" MiB
 */
filters.readableSize = (text, options) => {
  const bytes = parseInt(text);
  const prefixes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  let size = bytes;
  let prefixIndex = 0;
  for (; prefixIndex < prefixes.length; prefixIndex++) {
    if (size < 1024) {
      break;
    }
    size = size / 1024;
  }
  return size.toFixed(2) + ' ' + prefixes[prefixIndex];
};


/**
 * Convert duration in seconds into readable format, depending of value
 *    (hh:mm:ss, mm:ss)
 * @param  {String} text    Time in seconds (must be  a number)
 * @param  {Object} options Filter options (not used)
 * @return {String}         Formatted time
 * @example
 * readableDuration('64')  // => "01:04"
 */
filters.readableDuration = (text, options) => {
  let seconds = Math.round(parseFloat(text)) % 60;
  let minutes = Math.floor((seconds / 60)) % 60;
  const hours = Math.floor((seconds / 3600)) % 24;
  if (seconds < 10) {
    seconds = '0' + seconds;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  let result = `${ minutes }:${ seconds }`;
  if (hours > 0) {
    result = hours + ':' + result;
  }
  return result;
};


/**
 * Cut long file name to max length, replacing part of string with placeholder
 * @param  {String} text                String to cut
 * @param  {Number} options.length      Max string length
 * @param  {String} options.placeholder Omitted part placeholder
 * @return {String}                     String cut to length
 */
filters.shortFileName = (text, {length, placeholder}) => {
  const ext = path.extname(text);
  const name = path.basename(text, ext);
  if (name.length <= length) {
    return filters.escape(name) + ext;
  }
  return filters.escape(name.substring(0, length)) + placeholder + ext;
};


/**
 * Escape HTML characters in string
 * @param  {String} text    String to escape
 * @param  {Object} options Filter options (not used)
 * @return {String}         Escaped string
 */
filters.escape = (text, options) => {
  const entities = {
    '\n': '<br>',
    '>': '&gt;',
    '<': '&lt;',
    '&': '&amp;',
    '"': '&quot;',
    '\'': '&#39;'
  };
  let acc = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    acc += entities[char] || char;
  }
  return acc;
};


/**
 * Encode special characters
 * @param  {String} text Text to encode
 * @return {String}      Encoded string
 */
filters.encodeUri = (text) => encodeURI(decodeURI(text));


module.exports = filters;
