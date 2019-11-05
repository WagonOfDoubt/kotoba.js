const express = require('express');
const router = express.Router();
const _ = require('lodash');
const { checkSchema } = require('express-validator');
const { validateRequest, filterMatched } = require('../../middlewares/validation');
const { createPost, updatePosts } = require('../../controllers/posting.js');
const { filterPostTargetItems,
  populatePostUpdateItems,
  filterOutOfBoundItems,
  findUserRoles } = require('../../middlewares/post');
const { postEditPermission } = require('../../middlewares/permission');
const boardparams = require('../../json/boardparams');
const multer = require('multer');
const upload = multer();


/**
 * @api {post} /api/post Create post
 * @apiName CreatePost
 * @apiGroup Post
 * @apiPermission anyone
 * @apiDescription Create thread or reply to thread
 * @apiParam (files) {Buffer[]} attachments Binary files
 * @apiParam {String}   boardUri Posting board
 * @apiParam {Number}   [threadId=0] Parent thread. If omitted or 0, new
 *    thread will be created.
 * @apiParam {String}   [createdAt=Date.now()] Date of post creation. Must be
 *    compliant with ISO8601. User must have permission to specify arbitrary
 *    posting date or else this fields will be ignored and current date will
 *    be used instead.
 * @apiParam {String}   [name] Poster name. Depending on board preferences,
 *    this field can be ignored and default name will be used instead.
 * @apiParam {String}   [tripcode] Poster tripcode. Depending on board
 *    preferences, this field can be ignored.
 * @apiParam {String}   [email] Poster email or other link
 * @apiParam {String}   [subject] Post subject. Depending on board
 *    preferences, this can be ignored for replies.
 * @apiParam {String}   [captcha] Answer to captcha challenge
 * @apiParam {String}   [body] Post message
 * @apiParam {String}   [password] Password for post deletion
 * @apiParam {Boolean}  [isSage=false] Don't bump thread. For replies only.
 * @apiParam {Object[]} [attachments] Array of attachments info. Files itself
 *    should be transfered as binary in multipart/formdata
 * @apiParam {String}   [attachments.name] File name (overrides original file
 *    name)
 * @apiParam {Boolean}  [attachments.isNSFW=false] Mark attachment as NSFW
 * @apiParam {Boolean}  [attachments.isSpoiler=false] Mark attachment as
 *    spoiler
 * @apiParam {Boolean}  [regenerate=true] Whether or not to generate static
 *    HTML files
 * @param {Boolean} [useUserName=false] Use logged in user name instead of
 *    name in form
 * @param {Boolean} [displayStaffStatus=false] Display user staff status
 *    (authority or role)
 * @param {Boolean} [useMarkdown=false] Use markdown parser with raw HTML tags
 *    instead of default markup
 * @apiUse FileFormatNotSupportedError
 * @apiUse ThumbnailGenerationError
 * @apiUse FileTooLargeError
 * @apiUse PostingError
 * @apiUse DocumentNotFoundError
 * @apiUse CaptchaEntryNotFoundError
 * @apiUse IncorrectCaptchaError
 * @apiSuccess (Success 201) {String} location Url that leads to post
 * @apiSuccess (Success 201) {String} boardUri Post board
 * @apiSuccess (Success 201) {Number} threadId Post parent thread number
 * @apiSuccess (Success 201) {Number} postId Post number
 * @apiSuccessExample {json} Success response:
 *     HTTP/1.1 201 Created
 *     Location: /b/res/386.html#post-b-392
 *     {
 *       "postId": 392,
 *       "boardUri": "b",
 *       "threadId": 386,
 *       "location": "/b/res/386.html#post-b-392"
 *     }
 */
router.post('/api/post',
  upload.array('attachments'),
  checkSchema({
    boardUri: {
      in: 'body',
      isLength: {
        options: { min: 1 },
        errorMessage: 'Board uri must not be empty',
      },
      matches: {
        options: [/^[a-z0-9_]*$/],
        errorMessage: 'Board uri can contain only letters and numbers or underscore',
      },
      custom: {
        options: (v) => !boardparams.uriBlacklist.includes(v),
        errorMessage: 'This board uri is not allowed',
      },
    },
    threadId: {
      in: 'body',
      isInt: {
        options: { min: 0 },
      },
      toInt: true,
      optional: true,
    },
    createdAt: {
      in: 'body',
      isISO8601: {
        errorMessage: 'Date must be compliant with ISO8601 standard'
      },
      toDate: true,
      optional: true,
    },
    name: {
      in: 'body',
      trim: true,
      optional: true,
    },
    tripcode: {
      in: 'body',
      trim: true,
      optional: true,
    },
    email: {
      in: 'body',
      trim: true,
      optional: true,
    },
    subject: {
      in: 'body',
      trim: true,
      optional: true,
    },
    body: {
      in: 'body',
      trim: true,
      optional: true,
    },
    password: {
      in: 'body',
      trim: true,
      optional: true,
    },
    isSage: {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'attachments.*.isSpoiler': {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'attachments.*.isNSFW': {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'attachments.*.name': {
      in: 'body',
      trim: true,
      optional: true,
    },
    captcha: {
      in: 'body',
      trim: true,
      optional: true,
    },
    displayStaffStatus: {
      in: 'body',
      toBoolean: true,
      optional: true,
    },
    useUserName: {
      in: 'body',
      toBoolean: true,
      optional: true,
    },
    useMarkdown: {
      in: 'body',
      toBoolean: true,
      optional: true,
    },
    regenerate: {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
  }),
  validateRequest,
  filterMatched,
  async (req, res, next) => {
    try {
      const postData = _.pick(req.body, [
        'boardUri',
        'threadId',
        'createdAt',
        'name',
        'tripcode',
        'email',
        'subject',
        'body',
        'password',
        'isSage',
        'attachments',
      ]);
      postData.attachments =
        _.map(
          _.zip(req.files || [], postData.attachments || []),
          ([fileDesc, fileOpts]) => {
            if (!fileDesc) {
              return null;
            }
            fileDesc.isSpoiler = (fileOpts && fileOpts.isSpoiler) || false;
            fileDesc.isNSFW = (fileOpts && fileOpts.isNSFW) || false;
            fileDesc.originalname = (fileOpts && fileOpts.name) || fileDesc.originalname;
            return fileDesc;
          });
      postData.attachments = _.filter(postData.attachments, (o) => !!o);
      const posterInfo = {
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        session: req.session,
      };
      const options = _.pick(req.body, [
        'captcha',
        'regenerate',
        'displayStaffStatus',
        'useUserName',
        'useMarkdown',
      ]);
      const result = await createPost(postData, posterInfo, options);
      return res
        .status(201)
        .location(result.location)
        .json(result);
    } catch(err) {
      next(err);
    }
  }
);


/**
 * @api {patch} /api/post Update posts
 * @apiName UpdatePosts
 * @apiGroup Post
 * @apiPermission anyone
 * @apiDescription Partially update posts. This endpoint tries to apply each
 *    update separately, therefore if some updates are invalid, other updates
 *    will be applied, if possible. Each update action has its own HTTP
 *    status. HTTP 4xx errors shown below are returned only if there was no
 *    successful updates, if at least one update was applied, HTTP status 200
 *    will be returned with success and fail arrays. Posts can be changed by
 *    original poster by supplying post password as proof or by logged in user
 *    who has role on board with respective permission.
 * @apiParam {Boolean}  [regenerate=false] Whether or not to update associated
 *    HTML
 * @apiParam {String}   [postpassword] Password that user entered when posting
 * @apiParam {Object[]} items List of posts and parameters to update
 * @apiParam {Object}   items.target Reference to Post to update
 * @apiParam {String}   items.target.boardUri Post board
 * @apiParam {Number}   items.target.postId Post number
 * @apiParam {Object}   items.update Object with fields and values to change
 * @apiParam {Boolean}  [items.update.isSticky] Is thread always on top
 * @apiParam {Boolean}  [items.update.isClosed] Is thread closed for posting
 * @apiParam {Boolean}  [items.update.isSage] Do not bump thread
 * @apiParam {Boolean}  [items.update.isApproved] Reserved for future use
 * @apiParam {Boolean}  [items.update.isDeleted] Is post marked as deleted
 * @apiParam {Object[]} [items.update.attachments] Post attachments properties
 * @apiParam {Boolean}  [items.update.attachments.isDeleted] Is attachment set
 *    for deletion
 * @apiParam {Boolean}  [items.update.attachments.isNSFW] Is attachment set as
 *    not safe for work
 * @apiParam {Boolean}  [items.update.attachments.isSpoiler] Is attachment set
 *    as spoiler
 * @apiSuccess {Object[]} success List of successful updates
 * @apiSuccess {Object}   success.ref Reflink to post
 * @apiSuccess {Number}   success.status HTTP status for this action
 * @apiSuccess {Object}   success.updated Keys and values of updated
 *    properties
 * @apiSuccess {Object[]} fail List of updates that were rejected
 * @apiSuccess {Object}   fail.ref Reflink to post, if post was resolved
 * @apiSuccess {Object}   fail.target If post was not resolved, original
 *    target object that was in request
 * @apiSuccess {Number}   fail.status HTTP status for this action
 * @apiSuccess {Object}   fail.update Update object with properties from
 *    request that were not applied
 * @apiSuccess {Object}   fail.error  Error object
 * @apiSuccess {String}   fail.error.type  Error type
 * @apiSuccess {String}   fail.error.msg  Error message
 * @apiSuccess {String}   fail.error.roleName  If error related to
 *    permissions, user role name
 * @apiSuccess {String}  fail.error.userPriority  If error related to
 *    permissions, user priority for editing field
 * @apiSuccess {String}  fail.error.currentPriority  If error related to
 *    permissions, current priority for this field
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
router.patch('/api/post', 
  checkSchema({
    'items.*.target.boardUri': {
      in: 'body',
      isLength: {
        options: { min: 1 },
        errorMessage: 'Board uri must not be empty',
      },
      matches: {
        options: [/^[a-z0-9_]*$/],
        errorMessage: 'Board uri can contain only letters and numbers or underscore',
      },
      custom: {
        options: (v) => !boardparams.uriBlacklist.includes(v),
        errorMessage: 'This board uri is not allowed',
      },
    },
    'items.*.target.postId': {
      in: 'body',
      isInt: {
        options: { min: 0 },
      },
      toInt: true,
    },
    'items.*.update.isSticky': {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'items.*.update.isClosed': {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'items.*.update.isSage': {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'items.*.update.isApproved': {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'items.*.update.isDeleted': {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'items.*.update.attachments.isDeleted': {
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'items.*.update.attachments.isNSFW': {
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    'items.*.update.attachments.isSpoiler': {
      isBoolean: true,
      toBoolean: true,
      optional: true,
    },
    postpassword: {
      trim: true,
    },
    regenerate: {
      in: 'body',
      isBoolean: true,
      toBoolean: true,
    }
  }),
  validateRequest,
  // filters req.body.items so only posts that can be changed by current user
  // are present
  filterPostTargetItems,
  populatePostUpdateItems,
  filterOutOfBoundItems,
  findUserRoles,
  postEditPermission,
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

      const posterInfo = {
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        session: req.session,
      };

      const { success, fail } = await updatePosts(items, posterInfo, regenerate);
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
