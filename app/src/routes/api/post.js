const express = require('express');
const router = express.Router();
const postHandlers = require('../handlers/post');

/**
 * @api {post} /api/post Create post
 *
 * @apiName CreatePost
 *
 * @apiGroup Post
 *
 * @apiPermission anyone
 *
 * @apiDescription Create thread or reply to thread
 * 
 */
router.post('/api/post', postHandlers.createPostHandler);


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
router.patch('/api/post', postHandlers.modifyPostHandler);


module.exports = router;
