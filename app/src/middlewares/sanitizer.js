const _ = require('lodash');

/**
 * Creates express middleware that deletes all fields in req.body that are not
 * in filterPaths array.
 * @param {string[]} filterPaths - The object properties to pick
 * @param {string} path - Path to object inside req.body to filter, if not
 * specified, req.body itself will be filtered. If value at path is not an
 * object, middleware returns to client HTTP status 400 with error in JSON.
 *
 * @example
 * router.post('/foo',
 * [
 *   sanitizer.filterBody(['data.foo', 'data.bar', 'param1', 'param2']),
 *   sanitizer.filterBody(['nestedVal'], 'param2.nested')
 * ],
 * (req, res) => {
 *   res.json(req.body);
 * });
 * 
 * request:
 * {
 *   "data": {
 *     "foo": "included 1",
 *     "bar": "included 2",
 *     "baz": "not included"
 *   },
 *   "param1": "some value",
 *   "param2": {
 *     "nested": {
 *       "nestedVal": "included nested field",
 *       "nestedVal2": "not included nested field"
 *     },
 *     "nested2": "other field that is included because only param2.nested is filtered"
 *   },
 *   "junk": "this parameter is omitted",
 *   "garbage": "this parameter is omitted too"
 * }
 * 
 * response:
 * {
 *   "data": {
 *     "foo": "included 1",
 *     "bar": "included 2"
 *   },
 *   "param1": "some value",
 *   "param2": {
 *     "nested": {
 *       "nestedVal": "included nested field"
 *     },
 *     "nested2": "other field that is included because only param2.nested is filtered"
 *   }
 * }
 *
 * @returns {function} express middleware function
 */
module.exports.filterBody = (filterPaths, path) => {
  return (req, res, next) => {
    try {
      let obj = req.body;
      if (path) {
        obj = _.get(req.body, path);
        if (!_.isObject(obj)) {
          return res.status(400).json({
            error: {
              type: 'RequestValidationError',
              msg: `${ path } is not an object`,
              param: path,
              value: obj,
              location: 'body',
            }
          });
        }
      }
      obj = _.pick(obj, filterPaths);
      if (path) {
        _.set(req.body, path, obj);
      } else {
        req.body = obj;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};


/**
 * Creates middleware that deletes all fields in array at specified path in
 * body that are not in filterPaths array
 * @param  {String[]} filterPaths - The object properties to pick
 * @param  {String} path - Path to array inside req.body
 * @return {function} express middleware function
 */
module.exports.filterArray = (filterPaths, path) => {
  return (req, res, next) => {
    try {
      let arr = _.get(req.body, path);
      if (!_.isArray(arr)) {
        return res.status(400).json({
          error: {
            type: 'RequestValidationError',
            msg: `${ path } is not an array`,
            param: path,
            value: arr,
            location: 'body',
          }
        });
      }
      arr = arr.map((obj) => _.pick(obj, filterPaths));
      _.set(req.body, path, arr);
      next();
    } catch (err) {
      next(err);
    }
  };
};


/**
 * Creates middleware that converts object at path in req.body to array
 * @param  {String} path - Path to object or array in req.body
 * @return {function} express middleware function
 */
module.exports.toArray = (path) => {
  return (req, res, next) => {
    try {
      let obj = req.body;
      if (path) {
        obj = _.get(req.body, path);
      }
      if (!_.isArray(obj)) {
        if (!_.isObject(obj)) {
          return res.status(400).json({
            error: {
              type: 'RequestValidationError',
              msg: `${ path } is not an array or object`,
              param: path,
              value: obj,
              location: 'body',
            }
          });
        }
        let arr = Array.from(Object.values(obj));
        if (path) {
          _.set(req.body, path, arr);
        } else {
          req.body = arr;
        }
      }
      console.log(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
};
