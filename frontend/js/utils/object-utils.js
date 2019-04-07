/**
 * Object utils module.
 * @module utils/object-utils
 */

import isEqual from 'lodash.isequal';
import isEmpty from 'lodash.isempty';
import cloneDeep from 'lodash.clonedeep';


/**
 * Check if a value is plain JS Object, not an array, primitive, or instance
 *    of class
 * @param  {Any} obj value
 * @return {Boolean}     true, if value is Object, but not a function,
 *    instance of class, array, or anything else, false otherwise
 * @example
 * utils.isSimpleObject([]);  // => false
 * utils.isSimpleObject({});  // => true
 */
export const isSimpleObject = (obj) =>
  obj instanceof Object && obj.constructor === Object;


/**
 * Flatten object to object where keys are dot-separated paths of nested keys
 * @param  {Object} obj    Object to flatten
 * @param  {Object} [result={}] Object to store values to
 * @param  {String} [path='']   root path to append to each key
 * @return {Object}        Flatten object
 * @example
 * const obj = {
 *   a: 1,
 *   b: {
 *     b1: [1, 2, 3],
 *     b2: 'a quick brown fox jumps over a lazy dog',
 *   },
 *   c: {
 *     c1: {
 *       c1a: 'we need',
 *       c1b: {
 *         c1b1: 'to go',
 *         c1b2: {
 *           c1b2a: 'deeper',
 *         },
 *       },
 *     },
 *   },
 *   d: [42],
 *   e: {},
 * };
 * const paths = utils.objectToPaths(obj);
 * // paths => {
 * //   'a': 1,
 * //   'b.b1': [1, 2, 3],
 * //   'b.b2': 'a quick brown fox jumps over a lazy dog',
 * //   'c.c1.c1a': 'we need',
 * //   'c.c1.c1b.c1b1': 'to go',
 * //   'c.c1.c1b.c1b2.c1b2a': 'deeper',
 * //   'd': [42],
 * //   'e': {},
 * // };
 */
export const objectToPaths = (obj, result = {}, path = '') => {
  Object.entries(obj).forEach(([key, value]) => {
    const newPath = path.length ? path + '.' + key : key;
    if (isSimpleObject(value) && !isEmpty(value)) {
      objectToPaths(value, result, newPath);
    } else {
      result[newPath] = value;
    }
  });
  return result;
};


/**
 * Compare two object and return an object with properties which values are
 *    different
 * @param  {Object}  newObj      Object with changed values
 * @param  {Object}  origObj     Original object to compare
 * @param  {Boolean} [deletedKeys=false] Whether or not to count keys that are
 *    missing in changed object as different value
 * @return {Object}              Object that contains keys and values that are
 *    different in two objects
 * @example
 * const origObj = {
 *   a: [1,2],
 *   b: 'old',
 *   c: 3,
 *   d: 9,
 *   e: 'same',
 * };
 * const newObj = {
 *   a: [1,2],
 *   b: 'new',
 *   c: 42,
 *   d: 9,
 *   e: 'same',
 * };
 * const diff = utils.objectDiff(newObj, origObj);
 * // diff => {
 * //   b: { new: 'new', old: 'old' },
 * //   c: { new: 42, old: 3 }
 * // };
 */
export const objectDiff = (newObj, origObj, deletedKeys = false) => {
  newObj = objectToPaths(newObj);
  origObj = objectToPaths(origObj);
  return Array
    .from(new Set([
      ...Object.keys(newObj),
      ...(deletedKeys ? Object.keys(origObj) : []),
    ]))
    .filter(key => !isEqual(origObj[key], newObj[key]))
    .reduce((diff, key) => {
      diff[key] = { new: newObj[key], old: origObj[key] };
      return diff;
    }, {});
};


/**
 * Assign properties of source object to destination object, to nested object
 *    in destination object and to objects in arrays in destination object.
 * @param  {Object} object Destination object
 * @param  {Object} source Source object where keys are paths of properties of
 *    destination object and values are values to assign. Paths can be
 *    represented with dot notation ('foo.bar.baz') or square brackets
 *    (foo[bar][baz]). To assign to objects in array, empty square brackets
 *    are used (foo[][bar] or foo[].bar)
 * @return {Object}        Copy of destination object with assigned
 *    properties
 *
 * @example
 * const data = {
 *   arr: [
 *     { id: 123 },
 *     { id: 456 },
 *     { id: 789 },
 *   ]
 * };
 *
 * const modifier = {
 *   'arr[][val]': 'something'
 * };
 *
 * const result = assignDeep(data, modifier);
 * // result => {
 * //   arr: [
 * //     { id: 123, val: 'something' },
 * //     { id: 456, val: 'something' },
 * //     { id: 789, val: 'something' },
 * //   ]
 * // };
 */
export const assignDeep = (object, source) => {
  object = cloneDeep(object);
  const setPath = (obj, path, value) => {
    let index = 0;
    let length = path.length;

    while (obj !== null && index < length) {
      let key = path[index++];
      if (Array.isArray(obj)) {
        // continue outside loop
        break;
      }

      if (index === length) {
        obj[key] = value;
        // done
        return;
      } else if (!obj[key]) {
        obj[key] = {};
      }
      obj = obj[key];
    }

    const rest = path.slice(index);
    obj.forEach(o => setPath(o, rest, value));
  };

  for (let [key, value] of Object.entries(source)) {
    const path = key.split(/[/[\.]/).map(s => s.replace(']', ''));
    setPath(object, path, value);
  }
  return object;
};
