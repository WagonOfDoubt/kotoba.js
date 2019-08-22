/**
 * Module with middlewares related to post api
 * @module middlewares/post
 */

const _ = require('lodash');
const fp = require('lodash/fp');
const flattenObject = require('flat');

const Post = require('../models/post');
const Role = require('../models/role');
const { RequestValidationError, DocumentNotFoundError } = require('../errors');


/**
 * Express middleware that filters invalid req.body.items by item.target
 * Valid req.body.items match schema:
 *   [
 *     {
 *       target: {
 *         boardUri: String,
 *         postId: Number (int)
 *       }
 *     },
 *     ...
 *   ]
 */
const filterPostTargetItems = (req, res, next) => {
  try {
    const items = req.body.items || [];
    res.locals.fail = res.locals.fail || [];

    if (!items.length) {
      const noItemsError = new RequestValidationError('No items specified', 'items', null, 'body');
      return noItemsError.respond(res);
    }

    // filter input and find unique posts
    const isValidTarget = (t) => _.has(t, 'boardUri') && _.has(t, 'postId');
    const [validTargets, invalidTargets] = _.partition(
      items,
      (i) => isValidTarget(i.target)
    );

    if (invalidTargets.length) {
      const invalidTargetError = new RequestValidationError('item.target is invalid', 'items', null, 'body');

      res.locals.fail = [
        ...res.locals.fail,
        ...invalidTargetError.assignToArray(invalidTargets, 'target')
      ];
      if (!validTargets.length) {
        return res
          .status(400)
          .json({
            fail: res.locals.fail,
          });
      }
    }
    req.body.items = validTargets;
    next();
  } catch (err) {
    next(err);
  }
};


/**
 * Express middleware to filter and merge items in post.body.items, can return
 *    response with status 400 (BAD REQUEST) if no valid entires are present
 *    in req.body.items. Invalid items will be added to res.locals.fail if
 *    there are any.
 *
 * @example
 * // original
 * req.body.items = [
 *   { target: { boardUri: 'b', postId: 123 }, update: { 'attachments.0.isDeleted': true } },
 *   {
 *     target: {
 *       boardUri: 'b',
 *       postId: 123
 *     },
 *     update: {
 *       'attachments': {
 *         '1': { isDeleted': true }
 *       }
 *     }
 *   },
 *   { target: { boardUri: 'b', postId: 456 }, update: { 'isSticky': true, invalidField: 123 } },
 *   { target: { boardUri: 'a', postId: 789, junk: 'some_junk' }, update: { 'isSage': true } },
 * ];
 * // becomes
 * req.body.items = [
 *   { target: { boardUri: 'b', postId: 123 }, update: { 'attachments.0.isDeleted': true, 'attachments.1.isDeleted': true } },
 *   { target: { boardUri: 'b', postId: 456 }, update: { 'isSticky': true } },
 *   { target: { boardUri: 'a', postId: 789 }, update: { 'isSage': true } },
 * ];
 */
const filterPostUpdateItems = (req, res, next) => {
  try {
    const items = req.body.items || [];
    res.locals.fail = res.locals.fail || [];

    if (!items.length) {
      const noItemsError = new RequestValidationError('No items specified', 'items', null, 'body');
      return noItemsError.respond(res);
    }

    // filter input and find unique posts
    const isValidTarget = (t) => _.has(t, 'boardUri') && _.has(t, 'postId');
    const [validTargets, invalidTargets] = _.partition(
      items,
      (i) => isValidTarget(i.target)
    );

    if (invalidTargets.length) {
      const invalidTargetError = new RequestValidationError('item.target is invalid', 'items', null, 'body');

      res.locals.fail = [
        ...res.locals.fail,
        ...invalidTargetError.assignToArray(invalidTargets, 'target')
      ];
      if (!validTargets.length) {
        return res
          .status(400)
          .json({
            fail: res.locals.fail,
          });
      }
    }

    const groupedItems = fp.compose(
      // merge values into target and updates array
      fp.mapValues((i) => ({
        target: i[0].target,
        // filter updates object
        update: fp.compose(
          fp.mapValues(fp.map(1)),
          fp.groupBy(_.head),
          fp.filter(([k, v]) => Post.isEditablePostField(k)),
          fp.flatten,
          fp.map(_.toPairs),
          fp.map(flattenObject),
          fp.filter(Boolean),
          fp.map('update')
        )(i)
      })),
      // group items into object by target
      fp.groupBy((item) => Post.toKey(item.target)),
      // sanitize items
      fp.map(fp.pick(['target.boardUri', 'target.postId', 'update'])),
    )(validTargets);

    const isUpdatesNonEmpty = (i) => !_.isEmpty(i.update);
    const [nonEmptyUpdates, emptyUpdates] = _.partition(
      _.values(groupedItems),
      isUpdatesNonEmpty);

    if (emptyUpdates.length) {
      const invalidUpdateError = new RequestValidationError('item.update is invalid', 'items', null, 'body');

      res.locals.fail = [
        ...res.locals.fail,
        ...invalidUpdateError.assignToArray(emptyUpdates, 'update')
      ];

      if (!nonEmptyUpdates.length) {
        return res
          .status(400)
          .json({
            fail: res.locals.fail,
          });
      }
    }

    const updatesWithDuplicates = nonEmptyUpdates
      .map((i) => ({
        ...i,
        update: _.pickBy(i.update, (v) => v.length > 1)
      }))
      .filter(isUpdatesNonEmpty);

    const updatesWithoutDuplicates = nonEmptyUpdates
      .map((i) => ({
        ...i,
        update: _.mapValues(
          _.pickBy(i.update, (v) => v.length === 1),
          _.first)
      }))
      .filter(isUpdatesNonEmpty);

    if (updatesWithDuplicates.length) {
      const duplicateError = new RequestValidationError('item.update has conflicts', 'items', null, 'body');

      res.locals.fail = [
        ...res.locals.fail,
        ...duplicateError.assignToArray(updatesWithDuplicates, 'update')
      ];

      if (!updatesWithoutDuplicates.length) {
        return res
          .status(400)
          .json({
            fail: res.locals.fail,
          });
      }
    }

    req.body.items = updatesWithoutDuplicates;
    next();
  } catch (err) {
    next(err);
  }
};


/**
 * Express middleware to populate req.body.items.target with Post documents
 *    from MongoDB. Can return response with status 404 Not Found if no Posts
 *    were found, otherwise req.body.items target will be replaced with
 *    corresponding Post documents and items with no corresponding posts found
 *    will be added to res.locals.fail if there are any.
 * @async
 */
const populatePostUpdateItems = async (req, res, next) => {
  try {
    res.locals.fail = res.locals.fail || [];
    const items = req.body.items || [];
    const postQuery = _.map(items, 'target');
    const keyPosts = fp.keyBy(Post.toKey);
    // get posts from DB
    const posts = keyPosts(await Post.findPosts(postQuery));
    const groupedValidatedItems = fp.compose(
      fp.mapValues(_.first),
      fp.groupBy((item) => Post.toKey(item.target)),
    )(items);

    const [ foundTargets, notFoundTargets ] = fp.compose(
      fp.map(_.fromPairs),
      fp.partition(([k, v]) => _.has(posts, k)),
      fp.entries,
    )(groupedValidatedItems);

    const notFoundItems = _.values(notFoundTargets);
    if (notFoundItems.length) {
      const notFoundError = new DocumentNotFoundError('Post', 'items', null, 'body');
      res.locals.fail = [
        ...res.locals.fail,
        ...notFoundError.assignToArray(notFoundItems)
      ];

      if (!_.values(foundTargets).length) {
        return res
          .status(404)
          .json({
            fail: res.locals.fail,
          });
      }
    }

    // match posts with corresponding update dictionaries
    req.body.items = _.values(
      _.mapValues(foundTargets, (v, k) => _.assign(v, { target: posts[k] })));
    next();
  } catch (err) {
    next(err);
  }
};


/**
 * Express middleware. Filters update items for array elements which are out
 *    of bounds for respective array for target post, i.e.
 *    "attachments.5.isDeleted" for Post that has only 4 attachments.
 * @async
 */
const filterOutOfBoundItems = (req, res, next) => {
  try {
    res.locals.fail = res.locals.fail || [];
    const items = req.body.items || [];
    const outOfBounds = [];
    const inBounds = [];
    for (let item of items) {
      const target = item.target;
      const update = item.update;
      const numAttachments = target.attachments.length;
      const attachmentOutOfBoundsFields = Object.keys(update)
        .filter(field => {
          return Post.isAttachmentField(field) &&
            parseInt(field.match(/\.(\d+)\./)[1]) >= numAttachments;
        });
      const outOfBoundsUpdates = _.pick(update, attachmentOutOfBoundsFields);
      const validUpdates = _.omit(update, attachmentOutOfBoundsFields);
      if (!_.isEmpty(outOfBoundsUpdates)) {
        outOfBounds.push({ ref: _.omit(target.toReflink(), 'src'), update: outOfBoundsUpdates });
      }
      if (!_.isEmpty(validUpdates)) {
        inBounds.push({ target, update: validUpdates });
      }
    }

    if (outOfBounds.length) {
      const outOfBoundsError = new RequestValidationError('Array index is out of bounds', 'items', null, 'body');

      res.locals.fail = [
        ...res.locals.fail,
        ...outOfBoundsError.assignToArray(outOfBounds)
      ];
      if (!inBounds.length) {
        return res
          .status(400)
          .json({
            fail: res.locals.fail,
          });
      }
    }
    req.body.items = inBounds;
    next();
  } catch (err) {
    next(err);
  }
};


/**
 * Express middleware that populates req.userRoles with roles of currently
 * logged in user, if possible.
 * 
 * @example
 * // req.userRoles
 * {
 *   a: { roleName: "moderator", _id: ObjectId(...), ...},
 *   b: { roleName: "janitor", _id: ObjectId(...), ...},
 *   ...
 * }
 * @async
 */
const findUserRoles = async (req, res, next) => {
  try {
    if (!req.user) {
      next();
      return;
    }
    const roleIds = Array.from(req.user.boardRoles.values());
    if (!roleIds.length) {
      next();
      return;
    }
    const roles = await Role
      .find({
        '_id': {
          '$in': roleIds
        },
      });
    const idToRole = roles
      .map(role => role.toObject())
      .reduce((acc, val) => {
        acc[val._id] = val;
        return acc;
      }, {});

    const assignedRoles = Array
      .from(req.user.boardRoles.entries())
      .reduce((acc, [k, v]) => ({...acc, [k]: idToRole[v]}), {});

    req.userRoles = assignedRoles;
    next();
  } catch (err) {
    next(err);
  }
};


module.exports.filterPostTargetItems = filterPostTargetItems;
module.exports.filterPostUpdateItems = filterPostUpdateItems;
module.exports.populatePostUpdateItems = populatePostUpdateItems;
module.exports.filterOutOfBoundItems = filterOutOfBoundItems;
module.exports.findUserRoles = findUserRoles;
