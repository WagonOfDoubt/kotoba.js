/**
 * Mongoose model helper functions
 * @module utils/model
 */

const _ = require('lodash');
const assert = require('assert');


/**
 * @typedef {Object} ApiQueryResponse
 * @property {Array} docs Array of documents
 * @property {Number} count Number of documents that matched query
 */


/**
 * Creates a function that returns documents from DB based on user-defined
 *    query
 * @param {String[]} selectableFields List of document fields that can be read
 *    by user
 * @returns {function} async function
 */
module.exports.createApiQueryHandler = (selectableFields) => {
  assert(_.isArray(selectableFields));
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
  const apiQueryFn = async function ({ search = '', filter = {}, select = [], sort = {}, skip = 0, limit = 50 } = {}) {
    if (!_.isInteger(limit)) {
      throw new TypeError('limit must be an integer');
    }
    if (!_.isInteger(skip)) {
      throw new TypeError('skip must be an integer');
    }
    const filterSelectableFields = (obj) => _.pick(obj, selectableFields);
    const alwaysExclude = [
      '_id',
      '__v',
    ];
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
    const conditions = {};
    const projection = {};
    const options = {};
    if (search) {
      conditions.$text = { $search: search };
    }
    if (!_.isEmpty(filter)) {
      filter = filterSelectableFields(filter);
      for (const [field, value] of _.toPairs(filter)) {
        if (_.isObject(value)) {
          const operators = _.toPairs(_.pick(value, allowedOperators));
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
    if (!_.isEmpty(select)) {
      for (const field of select) {
        if (_.includes, selectableFields, field) {
          projection[field] = 1;
        }
      }
    } else {
      for (const field of selectableFields) {
        projection[field] = 1;
      }
    }
    for (const field of alwaysExclude) {
      delete projection[field];
    }
    if (limit) {
      options.limit = Math.max(1, limit);
    }
    if (skip) {
      options.skip = Math.min(1000, Math.max(0, skip));
    }
    if (sort) {
      sort = filterSelectableFields(sort);
      options.sort = _.mapValues(sort, (v) => v > 0 ? 1 : -1);
    }

    const processResponse = res => _.omit(res.toObject({ minimize: false }), alwaysExclude);
    if (limit === 1) {
      const response = await this.findOne(conditions, projection, options);
      if (!response) {
        return null;
      }
      return processResponse(response);
    } else {
      const [response, count] = await Promise.all([
        this.find(conditions, projection, options),
        this.countDocuments(conditions),
      ]);
      if (!response.length) {
        return null;
      }
      return {
        docs: response.map(processResponse),
        count: count,
      };
    }
  };
  return apiQueryFn;
};
