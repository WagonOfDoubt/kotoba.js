/**
 * Utils for Mongoose Schema
 * @module utils/schema
 */

const hasDefault = (obj) => obj && obj.hasOwnProperty('default');
const isObject = (obj) => typeof obj === 'object' && obj.constructor === Object;
const isEmpty = (obj) => Object.keys(obj).length === 0;

const getDefaults = entries =>
  entries.reduce((prev, curr) => {
    const [key, value] = curr;
    if (hasDefault(value)) {
      if (value.default !== '') {
        prev[key] = value.default;
      }
    } else {
      if (isObject(value)) {
        const entr = Object.entries(value);
        if (entr.length) {
          const defaults = getDefaults(entr);
          if (!isEmpty(defaults)) {
            prev[key] = defaults;
          }
        }
      }
    }
    return prev;
  }, {});

module.exports.getDefaults = (object) =>
  getDefaults(Object.entries(object));
