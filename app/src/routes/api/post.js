const express = require('express');
const ObjectId = require('mongoose').Types.ObjectId;
const router = express.Router();
const { body } = require('express-validator/check');
const _ = require('lodash');
const fp = require('lodash/fp');
const flattenObject = require('flat');

const Post = require('../../models/post');
const Role = require('../../models/role');
const ModlogEntry = require('../../models/modlog');

const { updatePosts } = require('../../controllers/posting');
const { validateRequest } = require('../../middlewares/validation');
const { postEditPermission } = require('../../middlewares/permission');
const { createPostHandler } = require('../handlers/post');
const { RequestValidationError, DocumentNotFoundError } = require('../../errors');


/**
 * Express middleware to filter and merge items in post.body.items, can return
 * response with status 400 (BAD REQUEST) if no valid entires are present in
 * req.body.items. Invalid items will be added to res.locals.fail if there are
 * any.
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
      const invalidUpdateError = new RequestValidationError('item.target is invalid', 'items', null, 'body');

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
 * from MongoDB. Can return response with status 404 Not Found if no Posts
 * were found, otherwise req.body.items target will be replaced with
 * corresponding Post documents and items with no corresponding posts found
 * will be added to res.locals.fail if there are any.
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
 * Filters update items for array elements which are out of bounds for
 * respective array for target post, i.e. "attachments.5.isDeleted" for Post
 * that has only 4 attachments.
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


router.post('/api/post', createPostHandler);


/**
 * @api {patch} /api/post Update posts
 * 
 * @apiName UpdatePosts
 * 
 * @apiGroup Post
 * 
 * @apiPermission anyone
 * 
 * @apiDescription Partially update posts. This endpoint tries to apply each
 * update separately, therefore if some updates are invalid, other updates
 * will be applied, if possible. Each update action has its own HTTP status.
 * HTTP 4xx errors shown below are returned only if there was no successful
 * updates, if at least one update was applied, HTTP status 200 will be
 * returned with success and fail arrays. Posts can be changed by original
 * poster by supplying post password as proof or by logged in user who has
 * role on board with respective permission.
 *
 * @apiParam {Boolean}  regenerate Whether or not to update associated HTML
 * 
 * @apiParam {String}   postpassword Password that user entered when posting
 * 
 * @apiParam {Object[]} items List of posts and parameters to update
 * 
 * @apiParam {Object}   items.target Reference to Post to update
 * 
 * @apiParam {String}   items.target.boardUri Post board
 * 
 * @apiParam {Number}   items.target.postId Post number
 * 
 * @apiParam {Object}   items.update Object with fields and values to change
 * 
 * @apiParam {Boolean}  items.update.isSticky Is thread always on top
 * 
 * @apiParam {Boolean}  items.update.isClosed Is thread closed for posting
 * 
 * @apiParam {Boolean}  items.update.isSage Do not bump thread
 * 
 * @apiParam {Boolean}  items.update.isApproved Reserved for future use
 * 
 * @apiParam {Boolean}  items.update.isDeleted Is post marked as deleted
 * 
 * @apiParam {Object[]} items.update.attachments Post attachments properties
 * 
 * @apiParam {Boolean}  items.update.attachments.isDeleted Is attachment set
 * for deletion
 * 
 * @apiParam {Boolean}  items.update.attachments.isNSFW Is attachment set as
 * not safe for work
 * 
 * @apiParam {Boolean}  items.update.attachments.isSpoiler Is attachment set
 * as spoiler
 * 
 * @apiSuccess {Object[]} success List of successful updates
 * 
 * @apiSuccess {Object}  success.ref Reflink to post
 * 
 * @apiSuccess {Number}  success.status HTTP status for this action
 * 
 * @apiSuccess {Object}  success.updated Keys and values of updated properties
 * 
 * @apiSuccess {Object[]} fail List of updates that were rejected
 * 
 * @apiSuccess {Object}  fail.ref Reflink to post, if post was resolved
 * 
 * @apiSuccess {Object}  fail.target If post was not resolved, original target
 * object that was in request
 * 
 * @apiSuccess {Number}  fail.status HTTP status for this action
 * 
 * @apiSuccess {Object}  fail.update Update object with properties from
 * request that were not applied
 * 
 * @apiSuccess {Object}  fail.error  Error object
 * 
 * @apiSuccess {String}  fail.error.type  Error type
 * 
 * @apiSuccess {String}  fail.error.msg  Error message
 * 
 * @apiSuccess {String}  fail.error.roleName  If error related to permissions,
 * user role name
 * 
 * @apiSuccess {String}  fail.error.userPriority  If error related to
 * permissions, user priority for editing field
 * 
 * @apiSuccess {String}  fail.error.currentPriority  If error related to
 * permissions, current priority for this field
 *
 * @apiError RequestValidationError Request did not pass validation
 * @apiError PostNotFoundError      Target Post not found
 * @apiError PermissionDeniedError  User has no permission to do update
 *
 * @apiSuccessExample Changed successfully
 *     HTTP/1.1 200 OK
 *     {
 *       "success": [
 *         {
 *           "ref": {
 *             "boardUri": "b",
 *             "postId": 167,
 *             "threadId": 146,
 *             "isOp": false
 *           },
 *           "updated": {
 *             "isDeleted": true
 *           },
 *           "status": 200
 *         }
 *       ],
 *       "fail": []
 *     }
 *
 * @apiSuccessExample Nothing to change
 *     HTTP/1.1 200 OK
 *     {
 *       "success": [],
 *       "fail": [
 *         {
 *           "target": {
 *             "boardUri": "b",
 *             "postId": 146
 *           },
 *           "update": {
 *             "attachments.2.isSpoiler": true
 *           },
 *           "status": 204
 *         }
 *       ]
 *     }
 *
 * @apiErrorExample Conflicting values
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": {
 *         "code": "RequestValidationError",
 *         "param": "items",
 *         "location": "body"
 *       },
 *       "fail": [
 *         {
 *           "status": 400,
 *           "error": {
 *             "code": "RequestValidationError",
 *             "message": "item.update has conflicts"
 *           },
 *           "target": {
 *             "boardUri": "b",
 *             "postId": 146
 *           },
 *           "update": {
 *             "isDeleted": [
 *               true,
 *               false
 *             ]
 *           }
 *         }
 *       ]
 *     }
 *
 * @apiErrorExample Invalid array index
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": {
 *         "code": "RequestValidationError",
 *         "param": "items",
 *         "location": "body"
 *       },
 *       "fail": [
 *         {
 *           "status": 400,
 *           "error": {
 *             "code": "RequestValidationError",
 *             "message": "Array index is out of bounds"
 *           },
 *           "ref": {
 *             "boardUri": "b",
 *             "postId": 146,
 *             "threadId": 146,
 *             "isOp": true
 *           },
 *           "update": {
 *             "attachments.231.isSpoiler": true
 *           }
 *         }
 *       ]
 *     }
 * 
 * @apiErrorExample Invalid update object
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": {
 *         "code": "RequestValidationError",
 *         "param": "items",
 *         "location": "body"
 *       },
 *       "fail": [
 *         {
 *           "status": 400,
 *           "error": {
 *             "code": "RequestValidationError",
 *             "message": "item.update has no valid fields"
 *           },
 *           "target": {
 *             "boardUri": "b",
 *             "postId": 1465
 *           },
 *           "update": {}
 *         }
 *       ]
 *     }
 * 
 * @apiErrorExample Invalid target object
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": {
 *         "code": "RequestValidationError",
 *         "param": "items",
 *         "location": "body"
 *       },
 *       "fail": [
 *         {
 *           "status": 400,
 *           "error": {
 *             "code": "RequestValidationError",
 *             "message": "item.target is invalid"
 *           },
 *           "target": {
 *             "postId": 4444
 *           }
 *         }
 *       ]
 *     }
 * 
 * @apiErrorExample Target Post not found
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": {
 *         "code": "PostNotFoundError",
 *         "param": "items",
 *         "location": "body"
 *       },
 *       "fail": [
 *         {
 *           "status": 404,
 *           "error": {
 *             "code": "PostNotFoundError",
 *             "message": "Post not found"
 *           },
 *           "target": {
 *             "boardUri": "b",
 *             "postId": 4213123
 *           },
 *           "update": {
 *             "isSage": true
 *           }
 *         }
 *       ]
 *     }
 * 
 * @apiErrorExample Permission denied
 *     HTTP/1.1 403 Forbidden
 *     {
 *       "error": {
 *         "code": "PermissionDeniedError",
 *         "location": "body",
 *         "param": "items"
 *       },
 *       "fail": [
 *         {
 *           "ref": {
 *             "boardUri": "b",
 *             "postId": 146,
 *             "threadId": 146,
 *             "isOp": true
 *           },
 *           "status": 403,
 *           "update": {
 *             "isSage": true
 *           },
 *           "error": {
 *             "code": "PermissionDeniedError",
 *             "message": "User priority 100 is less than current priority 200",
 *             "roleName": "moderator",
 *             "userPriority": 100,
 *             "currentPriority": 200
 *           }
 *         }
 *       ]
 *     }
 */
router.patch(
  '/api/post',
  [
    body('items').exists().isArray(),
    body('regenerate').toBoolean(),
    body('postpassword').trim(),
    validateRequest,
    // filters req.body.items so only posts that can be changed by current user
    // are present
    filterPostUpdateItems,
    populatePostUpdateItems,
    filterOutOfBoundItems,
    findUserRoles,
    postEditPermission,
  ],
  async (req, res, next) => {
    try {
      const { items, regenerate } = req.body;
      if (_.isEmpty(items)) {
        if (_.isEmpty(res.locals.fail)) {
          return res.status(418);
        }
        const { status, error } = _.pick(res.locals.fail[0], 'status');
        return res
          .status(status)
          .json({
            fail: res.locals.fail
          });
      }

      const modlogData = {
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
      };

      const { success, fail } = await updatePosts(items, modlogData, regenerate);
      return res
        .status(200)
        .json({
          fail: [...res.locals.fail, ...fail],
          success: success,
        });
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
