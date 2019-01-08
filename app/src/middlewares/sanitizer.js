const _ = require('lodash');

/**
 * Creates custom sanitizer for express-validator that returns an object
 * composed of the picked object properties.
 * @param paths - The property paths to pick
 * @returns Custom sanitizer function
 */
module.exports.pick = (paths) => {
  return (object) => _.pick(object, paths);
};

