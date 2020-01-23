/**
 * Express middleware for REST api
 * @module middlewares/restapi
 */

const mongoose = require('mongoose');
const _ = require('lodash');
const fp = require('lodash/fp');
const assert = require('assert');

const {
  RequestValidationError,
  DocumentNotFoundError,
  DocumentNotModifiedError } = require('../errors');


/**
 * Create express middleware that populates res.locals.documents with
 *    documents retrieved from DB. Populates res.locals.fail with errors.
 *    Will respond with 404 status if no documents were found.
 * @param  {Model}  model        Mongoose model
 * @param  {String} arrayName    Name of array in body
 * @return {function}            async express middleware
 * @static
 */
const populateDocumentsByIds = (model, arrayName) => {
  assert(model.prototype instanceof mongoose.Model);
  assert(_.isString(arrayName));

  return async (req, res, next) => {
    try {
      const items = req.body[arrayName];
      assert(_.isArray(items));
      if (!items.length) {
        const validationError =
          new RequestValidationError('Array is empty', arrayName, items, 'body');
        return validationError.respond(res);
      }

      const pathToId = '_id';
      const ids = _.uniq(_.map(items, pathToId));
      const documents = await model.find({ _id: { $in: ids } });

      const groupedDocuments = _.mapValues(_.groupBy(documents, '_id'), _.head);
      const [foundItems, notFoundItems] = _.partition(items,
        item => _.has(groupedDocuments, _.get(item, pathToId)));

      if (notFoundItems.length) {
        const notFoundError =
          new DocumentNotFoundError(model.modelName, arrayName, null, 'body');
        res.locals.fail = [
          ...(res.locals.fail || []),
          ...notFoundError.assignToArray(notFoundItems)
        ];
      }

      if (!foundItems.length) {
        return res
          .status(404)
          .json({
            fail: res.locals.fail
          });
      }

      req.body[arrayName] = foundItems;
      res.locals.documents = groupedDocuments;
      next();
    } catch (err) {
      next(err);
    }
  };
};


/**
 * Create express middleware that groups multiple objects in
 *    req.body[arrayName] by _id field and detects conflicts, where objects
 *    with same value of _id field has different values for same key. If no
 *    valid objects found, it will return 400 HTTP status to the client.
 *    Populates res.locals.fail with errors.
 * @example
 * // original request
 * req.body.someArray =
 * [
 *   { _id: "id1", isDeleted: false, isHidden: true },
 *   { _id: "id1", isDeleted: true },
 *   { _id: "id2", isDeleted: true, someOtherData: "foo" },
 * ]
 * // after middleware removeDuplicates(someArray, ['isDeleted', 'isHidden'])
 * res.locals.fail = [
 *   { _id: "id1", isDeleted: [true, false], error: ... },
 * ]
 * req.body.someArray =
 * [
 *   { _id: "id1", isHidden: true },
 *   { _id: "id2", isDeleted: true },
 * ]
 * @param  {String}   arrayName      Name of array in body
 * @param  {String[]} editableFields Array with valid keys for objects
 * @return {function}                Express middleware
 * @static
 */
const removeDuplicates = (arrayName, editableFields) => {
  assert(_.isString(arrayName));
  assert(_.isArray(editableFields));
  return (req, res, next) => {
    try {
      const items = req.body[arrayName];
      const hasValidFields = (o) => _.findKey(o, (v,k) => editableFields.includes(k));
      const [nonEmptyUpdates, emptyUpdates] = _.partition(items, hasValidFields);

      if (emptyUpdates.length) {
        const invalidUpdateError = new RequestValidationError(
          'Update is invalid', arrayName, null, 'body');
        res.locals.fail = [
          ...(res.locals.fail || []),
          ...invalidUpdateError.assignToArray(emptyUpdates)
        ];
      }

      if (!nonEmptyUpdates.length) {
        return res
          .status(400)
          .json({
            fail: res.locals.fail,
          });
      }

      /**
       * Group array of object into one object where value is an array of all
       *   _different_ values by same key
       * @example
       * var objects = [
       *   {a: 1, b: 2, c:3},
       *   {a: 1, b: 4, c:3},
       *   {a: 3, b: 5, c:3},
       * ];
       * joinObjects(objects) =>
       * {
       *   a: [1, 3],
       *   b: [2, 4, 5],
       *   c: [3],
       * }
       * @param  {Object[]} Array of objects
       * @return {Object.<String, Array>} Object with arrays of values
       */
      const joinObjects = (objects) =>
        _.mapValues(
          _.reduce(objects, (acc, obj) => {
            _.forEach(obj, (value, key) => {
              (acc[key] || (acc[key] = [])).push(value);
            });
            return acc;
          }, {}),
          _.uniq);

      const groupedUpdates = fp.compose(
          fp.map(joinObjects),
          fp.groupBy('_id'),
        )(nonEmptyUpdates);

      const pickNoDuplicates = fp.pickBy(
        (value, key) => key === '_id' || value.length === 1);
      const pickDuplicates   = fp.pickBy(
        (value, key) => key === '_id' || value.length > 1);

      const updatesWithoutDuplicates = groupedUpdates
        .map(pickNoDuplicates)
        .filter(hasValidFields)
        // unwrap all
        .map(fp.mapValues(_.head));

      const takeFirstValueExceptId = (v, k) => k === '_id' ? v[0] : v;
      const updatesWithDuplicates = groupedUpdates
        .map(pickDuplicates)
        .filter(hasValidFields)
        // unwrap _id, leave other properties as arrays
        .map(fp.mapValues(takeFirstValueExceptId));

      if (updatesWithDuplicates.length) {
        const duplicateError = new RequestValidationError(
          'Conflicting updates', arrayName, null, 'body');
        res.locals.fail = [
          ...(res.locals.fail || []),
          ...duplicateError.assignToArray(updatesWithDuplicates)
        ];
      }

      if (!updatesWithoutDuplicates.length) {
        return res
          .status(400)
          .json({
            fail: res.locals.fail,
          });
      }

      req.body[arrayName] = updatesWithoutDuplicates;
      next();
    } catch (err) {
      next(err);
    }
  };
};


/**
 * Create express middleware that compares objects in req.body[arrayName] with
 *    res.locals.documents and leaves only properties with different values.
 *    If none of properties are different, responds with 200 HTTP status.
 *    Populates res.locals.fail with errors.
 * @param  {String} arrayName Name of array in body
 * @return {function}         Express middleware
 * @static
 */
const compareRequestWithDocuments = (arrayName) => {
  assert(_.isString(arrayName));
  return (req, res, next) => {
    try {
      const originalGrouped = res.locals.documents;
      const changedGrouped = _.mapValues(
        _.groupBy(req.body[arrayName], '_id'),
        _.head);

      const hasChanges = [];
      const noChanges = [];
      for (const _id in originalGrouped) {
        const base = originalGrouped[_id];
        const update = changedGrouped[_id];
        const sameValues = _.pickBy(update,
          (v, k) => k !== '_id' && base[k] === v);
        const changedValues = _.pickBy(update,
          (v, k) => k !== '_id' && base[k] !== v);
        if (!_.isEmpty(sameValues)) {
          noChanges.push({ _id, ...sameValues });
        }
        if (!_.isEmpty(changedValues)) {
          hasChanges.push({ _id, ...changedValues });
        }
      }

      if (noChanges.length) {
        const noChangesError = new DocumentNotModifiedError(
          'Document', arrayName, null, 'body');
        res.locals.fail = [
          ...(res.locals.fail || []),
          ...noChangesError.assignToArray(noChanges)
        ];
      }

      if (!hasChanges.length) {
        return res
          .status(200)
          .json({
            fail: res.locals.fail,
          });
      }

      req.body[arrayName] = hasChanges;
      next();
    } catch (err) {
      next(err);
    }
  };
};


/**
 * Create express middleware that applies objects in req.body[arrayName] to
 *    mongoose documents in res.locals.documents and runs mongoose validator
 *    middleware. Will respond with 400 HTTP status to the client if nothing
 *    is valid.
 * @param  {String} arrayName Name of array in body
 * @return {function}         Express middleware
 * @static
 */
const applyAndValidateDocuments = (arrayName) => {
  assert(_.isString(arrayName));
  return async (req, res, next) => {
    try {
      const items = _.mapValues(
        _.groupBy(req.body[arrayName], '_id'),
        _.head);
      const affectedDocuments = _.pickBy(res.locals.documents,
        (value, key) => _.has(items, key));
      const validationPromises = _.map(affectedDocuments, (doc, id) => {
        const currentItem = items[id];
        const currentUpdate = _.omit(currentItem, ['_id']);
        doc.set(currentItem);
        return new Promise((resolve, reject) =>
          doc
            .validate()
            .catch(validationError => {
              const [invalidFields, validFields] = _.partition(
                _.keys(currentUpdate),
                (v) => _.has(validationError.errors, v));
              if (invalidFields.length === 1) {
                const invalidUpdates = _.pick(currentItem, invalidFields);
                const requestError = RequestValidationError.fromMongooseValidator(
                  validationError.errors[invalidFields[0]], 'body');
                const errorObj = {
                  _id: id,
                  ...invalidUpdates,
                  ...requestError.toResponse(),
                };
                res.locals.fail = [
                  ...(res.locals.fail || []),
                  errorObj,
                ];
              } else if (invalidFields.length > 1) {
                const invalidUpdates = _.pick(currentItem, invalidFields);
                const mongoError = RequestValidationError.fromMongooseValidator(
                  validationError.errors[invalidFields[0]], 'body');
                const errors = _.map(validationError.errors,
                  (mongoError) =>
                    RequestValidationError
                      .fromMongooseValidator(mongoError, 'body')
                      .toObject());
                const errorObj = {
                  _id: id,
                  status: 400,
                  ...invalidUpdates,
                  errors: errors,
                };
                res.locals.fail = [
                  ...(res.locals.fail || []),
                  errorObj,
                ];
              }
              if (validFields.length) {
                const validUpdates = _.pick(currentItem, validFields);
                resolve({
                  _id: id,
                  status: 400,
                  ...validUpdates
                });
              } else {
                resolve(null);
              }
            })
            .then(() => resolve(items[id])));
      });
      const validationResults = await Promise.all(validationPromises);
      const validObjects = validationResults.filter(_.isObject);
      if (!validObjects.length) {
        return res
          .status(400)
          .json({
            fail: res.locals.fail,
          });
      }
      req.body[arrayName] = validObjects;
      next();
    } catch (err) {
      next(err);
    }
  };
};


/**
 * Create generic GET request handler for that uses apiQuery function
 * @see module:utils/model~createApiQueryHandler
 * @param  {String} modelName Name of mongoose model
 * @return {function}         Express middleware
 * @static
 */
const createGetRequestHandler = (modelName) => {
  const model = mongoose.model(modelName);
  return async (req, res, next) => {
    try {
      const result = await model.apiQuery({
        search : req.query.search,
        filter : req.query.filter,
        select : req.query.select,
        sort   : req.query.sort,
        skip   : req.query.skip,
        limit  : req.query.limit,
      });
      if (!result) {
        const e = new DocumentNotFoundError(modelName, 'filter', req.query.filter, 'query');
        return e.respond(res);
      }
      return res
        .status(200)
        .json(result);
    } catch (err) {
      next(err);
    }
  };
};


module.exports.populateDocumentsByIds = populateDocumentsByIds;
module.exports.removeDuplicates = removeDuplicates;
module.exports.compareRequestWithDocuments = compareRequestWithDocuments;
module.exports.applyAndValidateDocuments = applyAndValidateDocuments;
module.exports.createGetRequestHandler = createGetRequestHandler;
