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


/**
 * Return object with default values defined in Mongoose Schema
 * @param  {Object} object The original object passed to the schema
 *    constructor (Schema#obj)
 * @return {Object}        Object with default values for each property
 * @see {@link https://mongoosejs.com/docs/api.html#schema_Schema-obj}
 * @alias module:utils/schema.getDefaults
 * @example
 * const someSchema = mongoose.Schema({
 *   foo: { type: Number, default: 123 },
 *   bar: { type: String, default: 'fgsfds' }
 * });
 *
 * getDefaults(someSchema.obj)
 * =>
 * {
 *   foo: 123,
 *   bar: 'fgsfds'
 * }
 */
module.exports.getDefaults = (object) =>
  getDefaults(Object.entries(object));
