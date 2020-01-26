/**
 * Mongoose model helper functions
 * @module utils/model
 */

const _ = require('lodash');
const fp = require('lodash/fp');
const assert = require('assert');


/**
 * A helper function that acts like lodash _.pick, but also picks paths in
 *    objects contained in nested arrays
 * @inner
 * @param  {Object}   obj   Source object
 * @param  {String[]} paths Array of paths to pick
 * @return {Object}         Filtered object
 * @example
 * const obj = {
 *   a1: 1,
 *   a2: 2,
 *   b: {
 *     b1: 11, b2: 12, b3: 13
 *   },
 *   c: [
 *     { c1: 21, c2: 22, c3: 23 },
 *     { c1: 24, c2: 25, c3: 26 },
 *     { c1: 27, c2: 28, c3: 29 }
 *   ],
 *   d: [
 *     {
 *       e: { e1: 111, e2: 112, e3: 113 },
 *       f: { f1: 121, f2: 122, f3: 123 }
 *     },
 *     {
 *       e: { e1: 211, e2: 212, e3: 213 },
 *       f: { f1: 221, f2: 222, f3: 223 }
 *     }
 *   ]
 * };
 * 
 * const select = ['a2', "b.b1", "b.b3", "c.c1", "c.c3","d.f"];
 * 
 * const pickObj = pickRecursive(obj, select);
 * 
 * // returns
 * {
 *   "a2": 2,
 *   "b": {
 *     "b1": 11,
 *     "b3": 13
 *   },
 *   "c": [
 *     {
 *       "c1": 21,
 *       "c3": 23
 *     },
 *     {
 *       "c1": 24,
 *       "c3": 26
 *     },
 *     {
 *       "c1": 27,
 *       "c3": 29
 *     }
 *   ],
 *   "d": [
 *     {
 *       "f": {
 *         "f1": 121,
 *         "f2": 122,
 *         "f3": 123
 *       }
 *     },
 *     {
 *       "f": {
 *         "f1": 221,
 *         "f2": 222,
 *         "f3": 223
 *       }
 *     }
 *   ]
 * }
 */
const pickRecursive = (obj, paths) => {
  const checkPath = (key) =>
  (p) => p && p.length && p[0] === key;

  const checkIfKeyInPaths = (key, paths) =>
    _.some(paths, checkPath(key));

  const getSubpaths = (key, paths) => {
    return _.flow([
      fp.filter(checkPath(key)),
      fp.map(_.tail),
      fp.filter(a => a && a.length)
    ])(paths);
  };

  const recursionFn = (obj, paths) => {
    const result = {};
    for (const [key, value] of _.toPairs(obj)) {
      const keyInPath = checkIfKeyInPaths(key, paths);
      if (keyInPath) {
        const subpaths = getSubpaths(key, paths);
        if (!subpaths.length) {
          result[key] = value;
        } else if (_.isArray(value)) {
          result[key] = _.flow([
            fp.map((a) => recursionFn(a, subpaths)),
            fp.filter(_.negate(_.isEmpty)),
          ])(value);
        } else if (_.isObject(value)) {
          const pickedObj = recursionFn(value, subpaths);
          console.log(key, pickedObj);
          if (!_.isEmpty(pickedObj)) {
            result[key] = pickedObj;
          }
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  };

  paths = _.map(paths, (v) => v.split('.'));
  return recursionFn(obj, paths);
};


/**
 * @apiDefine GenericGetApi
 *
 * @apiParam (query) {String} [search=""] Search text in fields with text
 *    index
 * @apiParam (query) {String} [filter=""] Filter documents that match
 *    specified condition. Filter must contain `field:value` pairs separated
 *    by spaces. String values must be enclosed in double quotes (`"`), but
 *    **NOT** single (`'`) quotes. Use 1 and 0 for boolean values. Simple
 *    `field:value` pair specifies equality condition. For other conditions
 *    operators can be used with following syntax:
 *    `field:$operator(argument)`.
 *
 *    Supported operators are:
 *    - `$eq`   Matches values that are equal to a specified value.
 *    - `$ne`   Matches all values that are not equal to a specified value.
 *    - `$gt`   Matches values that are greater than a specified value.
 *    - `$gte`  Matches values that are greater than or equal to a specified value.
 *    - `$lt`   Matches values that are less than a specified value.
 *    - `$lte`  Matches values that are less than or equal to a specified value.
 *    - `$in`   Matches any of the values specified in an array.
 *    - `$nin`  Matches none of the values specified in an array.
 *    
 *    For operators `$in` and `$nin` argument must be an array defined by
 *    enclosing values separated by `|` character in square brackets `[]`.
 *
 *    Examples:
 *    - `?filter=uri:"b"`
 *    - `?filter=isLocked:1`
 *    - `?filter=uri:$in(["a"|"b"]) postcount:$gte(42)`
 *
 *    Invalid `field:value` pairs are ignored without errors.
 *
 * @apiParam (query) {String} [select=""] List of field names to return
 *    separated by spaces
 * @apiParam (query) {String} [sort=""] List of field names to sort by
 *    separated by spaces. Sort order by default is ascending, to specify
 *    descending order, place `-` character before the field name.
 *
 * Example: - `?sort=postcount -createdAt`
 * @apiParam (query) {Number} [skip=0] Number of documents to skip
 *
 * @apiParam (query) {Number} [limit=100] Maximum number of documents to
 *    return. If limit=1 and count is not present, single document will be
 *    returned. Otherwise, object with field `docs` (array of documents) will
 *    be returned. Minimum value is `1` and maximum value is `1000`.
 * @apiParam (query) {Boolean} [count] If present in query, returned object
 *    will contain field `count` (number of matched documents without limit).
 *
 * @apiSuccess {Object[]} docs (if limit > 1) Array of matched documents
 * @apiSuccess {Number}   count (if limit > 1) Number of matched documents (without limit)
 * 
 * @apiSuccessExample Get multiple documents
 *     GET /api/board?filter=uri:$in(["b"|"a"])&select=name desc isLocked locale postcount uri&sort=-postcount&count
 *     HTTP/1.1 200 OK
 *     {
 *       docs: [
 *         {
 *           "name": "Random",
 *           "desc": "General discussion",
 *           "isLocked": false,
 *           "locale": "en",
 *           "postcount": 4815162342,
 *           "uri": "b"
 *         },
 *         {
 *           "name": "Anime",
 *           "desc": "Anime discussion",
 *           "isLocked": false,
 *           "locale": "jp",
 *           "postcount": 9000000,
 *           "uri": "a"
 *         }
 *       ],
 *       count: 2
 *     }
 *
 * @apiSuccessExample Get one document
 *     GET /api/board?filter=uri:b&select=createdAt postcount&limit=1
 *     HTTP/1.1 200 OK
 *     {
 *       "postcount": 4815162342,
 *       "createdAt": "2019-01-12T17:37:55.337Z"
 *     }
 */

/**
 * @typedef {Object} ApiQueryResponse
 * @property {Array} docs Array of documents
 * @property {Number} count Number of documents that matched query
 */


/**
 * Creates a function that returns documents from DB based on user-defined
 *    query
 * @param {Object} modelFieldsConfig Configuration object that defines document
 *    fields that can be read by user
 * @returns {function} async function
 */
module.exports.createApiQueryHandler = (modelFieldsConfig) => {
  assert(_.isObject(modelFieldsConfig));
  const isValidField = (key) => _.has(modelFieldsConfig, key);
  const allowedOperators = [
    '$eq',  // equal
    '$ne',  // not equal
    '$gt',  // greater than
    '$gte', // greater than or equal
    '$lt',  // less than
    '$lte', // less than or equal
    '$in',  // in array
    '$nin', // not in array
  ];
  const getOperators = _.flow([
    fp.pick(allowedOperators),
    fp.toPairs,
  ]);
  const selectByDefault = _.flow([
    fp.pickBy((v, k) => v.selectByDefault),
    fp.keys,
  ])(modelFieldsConfig);
  const replaceSelectAliases = (field) => modelFieldsConfig[field].alias || field;
  const processSelectObj = fp.flow([
    fp.filter((v, k) => isValidField(v)),
    fp.uniq,
    fp.map(replaceSelectAliases),
    fp.flatten,
  ]);

  /*
   * @inner
   * @async
   * @param  {String}   [options.search=""] Search string.
   * @param  {Object}   [options.filter={}] Filter object. Fields are field
   *    names and values are either desired values to match or object with one
   *    key-value pair where key is one of operators:
   *    
   *    - `$eq`   Matches values that are equal to a specified value.
   *    - `$gt`   Matches values that are greater than a specified value.
   *    - `$gte`  Matches values that are greater than or equal to a specified value.
   *    - `$in`   Matches any of the values specified in an array.
   *    - `$lt`   Matches values that are less than a specified value.
   *    - `$lte`  Matches values that are less than or equal to a specified value.
   *    - `$ne`   Matches all values that are not equal to a specified value.
   *    - `$nin`  Matches none of the values specified in an array.
   *
   * @param  {String[]} [options.select=[]] Which document fields to include. If
   *    empty, all available fields will be selected.
   * @param  {Object}   [options.sort={}]   Specify in the sort parameter the
   *    field or fields to sort by and a value of 1 or -1 to specify an
   *    ascending or descending sort respectively.
   * @param  {Number}   [options.skip=0]    How many documents to skip at the
   *    start.
   * @param  {Number}   [options.limit=50] How many documents to return. If
   *    limit is 1, returns single matched document, if limit > 1, object with
   *    array of documents and count of documents.
   * @return {(Document|module:utils/model~ApiQueryResponse)}   If limit = 1,
   *    returns single matched document, if limit > 1, object with array of
   *    documents and count of matched documents.
   *
   * @throws {TypeError} If skip or limit parameter is not an integer
   * @throws {TypeError} If argument for $-operator in filter object is invalid
   */
  const apiQueryFn = async function (
      {
        search = '',
        filter = {},
        select = selectByDefault,
        sort = {},
        skip = 0,
        limit = 50,
        count = false
      } = {}
    ) {
    if (!_.isInteger(limit)) {
      throw new TypeError('limit must be an integer');
    }
    if (!_.isInteger(skip)) {
      throw new TypeError('skip must be an integer');
    }
    // preprocessing arguments
    filter = _.pickBy(filter, (v, k) => {
      if (!isValidField(k)) {
        return false;
      }
      const config = modelFieldsConfig[k];
      return config.filter;
    });
    sort = _.pickBy(sort, (v, k) => isValidField(k));
    // select
    select = processSelectObj(select);

    const conditions = {};
    const projection = {};
    const options = {};
    const populate = {};
    // search
    if (search) {
      conditions.$text = { $search: search };
    }
    // filter
    if (!_.isEmpty(filter)) {
      for (const [field, value] of _.toPairs(filter)) {
        if (_.isObject(value)) {
          const operators = getOperators(value);
          if (!operators.length) {
            throw new Error('Filter object contains no valid operators');
          }
          if (operators.length > 1) {
            throw new Error('No more than one operator per field is supported');
          }
          let [operator, argument] = _.first(operators);
          if (['$in', '$nin'].includes(operator)) {
            if (!_.isArray(argument)) {
              throw new TypeError(`Argument for operator ${operator} must be an array`);
            }
          } else {
            if (!_.isString(argument) && !_.isNumber(argument)) {
              throw new TypeError(`Argument for operator "${operator}" must be a string or number`);
            }
          }
          conditions[field] = {};
          conditions[field][operator] = argument;
        } else {
          conditions[field] = value;
        }
      }
    }

    for (const field of select) {
      if (isValidField(field)) {
        const config = modelFieldsConfig[field];
        if (config.populate) {
          const [populateField, populateSelect] = config.populate;
          if (!populate[populateField]) {
            populate[populateField] = [];
          }
          populate[populateField].push(populateSelect);
        } else {
          projection[field] = 1;
        }
        const dependencies = config.dependsOn;
        if (dependencies && dependencies.length) {
          for (const dependency of dependencies) {
            projection[dependency] = 1;
          }
        }
      }
    }
    // limit
    if (limit) {
      options.limit = Math.max(1, limit);
    }
    // skip
    if (skip) {
      options.skip = Math.min(1000, Math.max(0, skip));
    }
    // sort
    if (sort) {
      options.sort = _.mapValues(sort, (v) => v > 0 ? 1 : -1);
    }

    const processResponse = (res) => {
      const obj = res.toObject({
        minimize: false,
        virtuals: true,
        flattenMaps: true,
      });
      if (!_.isEmpty(select)) {
        return pickRecursive(obj, select);
      }
      return obj;
    };
    let query;
    if (limit === 1) {
      query = this.findOne(conditions, projection, options);
    } else {
      query = this.find(conditions, projection, options);
    }
    if (!_.isEmpty(populate)) {
      for (const [populateField, populateSelect] of _.toPairs(populate)) {
        query.populate(populateField, populateSelect);
      }      
    }
    let response;
    if (count) {
      response = await Promise.all([
        query,
        this.countDocuments(conditions),
      ]);
    } else {
      response = await query;
    }
    if (!response || (limit !== 1 && !response.length)) {
      return null;
    }
    let documents;
    let documentCount;
    if (count) {
      documents = response[0];
      documentCount = response[1];
      if (limit === 1) {
        documents = [documents];
      }
      return {
        docs: _.map(documents, processResponse),
        count: documentCount,
      };
    } else {
      documents = response;
    }
    if (limit === 1) {
      return processResponse(documents);
    }
    return {
      docs: _.map(documents, processResponse),
    };
  };
  return apiQueryFn;
};
