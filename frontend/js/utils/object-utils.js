import isEqual from 'lodash.isequal';
import isEmpty from 'lodash.isempty';
import cloneDeep from 'lodash.clonedeep';


export const isSimpleObject = (obj) =>
  obj instanceof Object && obj.constructor === Object;


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
