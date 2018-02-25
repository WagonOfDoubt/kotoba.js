import isEqual from 'lodash.isequal';
import isEmpty from 'lodash.isempty';


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
