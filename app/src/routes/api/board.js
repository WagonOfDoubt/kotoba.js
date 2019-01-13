const express = require('express');
const router = express.Router();
const { oneOf, body, param, check, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');
const _ = require('lodash');

const boardController = require('../../controllers/board');
const Board = require('../../models/board');
const ModlogEntry = require('../../models/modlog');
const reqparser = require('../../middlewares/reqparser');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');
const sanitizer = require('../../middlewares/sanitizer');
const boardparams = require('../../json/boardparams');


/**
 * @apiDefine AuthRequiredError
 * @apiError AuthRequired User is not authenticated
 * @apiErrorExample AuthRequired
 *     HTTP/1.1 401 Unauthorized
 *     {
 *       "error": {
 *         "msg": "User must be logged in to perform this action",
 *         "type": "AuthRequired"
 *       }
 *     }
 */


/**
 * @apiDefine PermissionDeniedError
 * @apiError PermissionDenied User dont't have necessary permission
 * @apiErrorExample PermissionDenied
 *     HTTP/1.1 403 Forbidden
 *     {
 *       "error": {
 *         "msg": "User don't have rigths to perform this action",
 *         "type": "PermissionDenied"
 *       }
 *     }
 */


/**
 * @apiDefine BoardNotFoundError
 * @apiError BoardNotFound Board with specified uri was not found
 *
 * @apiErrorExample BoardNotFound
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": {
 *         "type": "BoardNotFound",
 *         "msg": "Board \"foo\" doesn't exist.",
 *         "param": "uri",
 *         "value": "foo",
 *         "location": "params",
 *       }
 *     }
 */


/**
 * @apiDefine BoardParams
 * 
 * @apiParam (Board data) {String} data.name="" Board title. If empty, board
 * uri will be used.
 * 
 * @apiParam (Board data) {String} data.desc="" Board descriptsion.
 * 
 * @apiParam (Board data) {String} data.header="" HTML under board title in
 * page header.
 * 
 * @apiParam (Board data) {String[]} data.imageUri Array of URLs. Overrides
 * the header image set in site settings. If left blank to use configured
 * global header image.
 * 
 * @apiParam (Board data) {String} data.faviconUri Board favicon. Overrides
 * default favicon. Leave blank to use default favicon.
 * 
 * @apiParam (Board data) {Number} data.maxFileSize=10485760 Maxmimum size of
 * uploaded images, in bytes.
 * 
 * @apiParam (Board data) {Number} data.maxFilesPerPost=4 Maximum uploads in
 * post. 0 forbids any uploads making board text only.
 * 
 * @apiParam (Board data) {Number} data.maxThreadsOnPage=10 How many threads
 * are displayed on page.
 * 
 * @apiParam (Board data) {Number} data.maxPages=10 Number of pages on board.
 * 
 * @apiParam (Board data) {Number} data.showReplies=5 Number of replies to
 * show on a board page.
 * 
 * @apiParam (Board data) {Number} data.showRepliesSticky=1 Number of replies
 * to show on a board page when the thread set as sticky.
 * 
 * @apiParam (Board data) {Number} data.autosage=500 The number of replies a
 * thread can have before autosaging. Also known as bump limit.
 * 
 * @apiParam (Board data) {Number} data.maxMessageLength=9001 Maximum nuber of
 * characters in post.
 * 
 * @apiParam (Board data) {String} data.defaultPosterName="Anonymous" Name to
 * display when a name is not attached to a post.
 * 
 * @apiParam (Board data) {Boolean} data.isLocked=false Only moderators of the
 * board and admins can make new posts/replies.
 * 
 * @apiParam (Board data) {Boolean} data.isHidden=false Do not dispaly this
 * board in navigation menu.
 * 
 * @apiParam (Board data) {Boolean} data.isForcedAnon=false If true, users
 * will not be allowed to enter a name, forcing to use default instead.
 * 
 * @apiParam (Board data) {String} data.defaultStyle="" The style which will
 * be set when the user first visits the board.
 * 
 * @apiParam (Board data) {String} data.locale="en" Locale to use on this
 * board. Leave blank to use the locale defined in site settings.
 * 
 * @apiParam (Board data) {Object} data.newThreadsRequired Object with boolean
 * values representing which fields are required for new threads.
 * 
 * @apiParam (Board data) {Boolean} data.newThreadsRequired.files=false If
 * true, new threads will require at least one attachment.
 * 
 * @apiParam (Board data) {Boolean} data.newThreadsRequired.message=false If
 * true, new threads will require message.
 * 
 * @apiParam (Board data) {Boolean} data.newThreadsRequired.subject=false If
 * true, new threads will require subject.
 * 
 * @apiParam (Board data) {Object} data.features Object with boolean values
 * representing which features on board turend on or off.
 * 
 * @apiParam (Board data) {Boolean} data.features.reporting=true Allow users
 * to report posts.
 * 
 * @apiParam (Board data) {Boolean} data.features.archive=true Enable/disable
 * thread archiving.
 * 
 * @apiParam (Board data) {Boolean} data.features.catalog=true Generate
 * catalog.html.
 * 
 * @apiParam (Board data) {Boolean} data.features.sage=true Allow users to
 * reply to threads without bumping them.
 * 
 * @apiParam (Board data) {Boolean} data.features.permanentSage=false If true,
 * poster can only sage thread once. After that, they no longer can post in
 * threads they saged.
 * 
 * @apiParam (Board data) {Boolean} data.allowRepliesSubject=true Display
 * subject field in form for replying in thread.
 */


/**
 * @api {get} /api/board/:uri? Get Boards
 * @apiName GetBoard
 * @apiGroup Board
 * @apiPermission anyone
 * 
 * @apiParam {String} uri="" Optional. If specified, returns one board object.
 * If empty, returns array of all boards.
 *
 * @apiParam (query) {String} select Optional. Comma-separated values that
 * define which parameters of board to return. If empty, default set of params
 * will be returned, as shown below. If equals "!all", all parameters will be
 * returned.
 * 
 * @apiSuccessExample GET /api/board/:
 *     HTTP/1.1 200 OK
 *     [
 *        {
 *          "name": "Random",
 *          "desc": "General discussion",
 *          "isLocked": false,
 *          "locale": "en",
 *          "postcount": 4815162342,
 *          "uri": "b"
 *        },
 *        {
 *          "name": "Anime",
 *          "desc": "Anime discussion",
 *          "isLocked": false,
 *          "locale": "jp",
 *          "postcount": 9000000,
 *          "uri": "a"
 *        }
 *      ]
 *
 * @apiSuccessExample GET /api/board/b:
 *     HTTP/1.1 200 OK
 *     {
 *       "name": "Random",
 *       "desc": "General discussion",
 *       "isLocked": false,
 *       "locale": "en",
 *       "postcount": 4815162342,
 *       "uri": "b"
 *     }
 *
 * @apiSuccessExample GET /api/board/b?select=createdDate,postcount:
 *     HTTP/1.1 200 OK
 *     {
 *       "postcount": 4815162342,
 *       "createdDate": "2019-01-12T17:37:55.337Z"
 *     }
 *
 * @apiUse BoardNotFoundError
 *
 * @apiError RequestValidationError Board uri has wrong format (must contain
 * only latin letters or numbers and underscore).
 *
 * @apiErrorExample RequestValidationError
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": {
 *         "location": "params",
 *         "param": "uri",
 *         "value": "фгсфдс",
 *         "msg": "Board uri can contain only letters and numbers or underscore",
 *         "type": "RequestValidationError"
 *       }
 *     }
 */
router.get(
  '/api/board/:uri?',
  [
    param('uri', 'Board uri can contain only letters and numbers or underscore')
      .matches(/[a-zA-Z0-9_]*$/),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      let selectQuery = (req.query.select && req.query.select.split(',')) || [];
      if (selectQuery.length === 0) {
        selectQuery = boardparams.defaultGetFields;
      }
      if (selectQuery.includes('!all')) {
        selectQuery = ['-_id', '-__v'];
      } else {
        selectQuery = selectQuery.filter(q => boardparams.allFields.includes(q));
        selectQuery = [...selectQuery, '-_id'];
      }
      const boardUri = req.params.uri && req.params.uri.toLowerCase();
      const q = {};
      if (!req.user) {
        q.isHidden = false;
      }
      if (boardUri) {
        if (boardUri) {
          q.uri = boardUri;
        }
        const board = await Board.findOne(q, selectQuery).exec();
        if (board) {
          return res
            .status(200)
            .json(board.toObject({ minimize: false }));
        } else {
          return res
            .status(404)
            .json({
              error: {
                type: 'BoardNotFound',
                msg: `Board "${ boardUri }" doesn't exist`,
                param: 'uri',
                value: boardUri,
                location: 'params',
              }
            });
        }
      } else {
        const boards = await Board.find(q, selectQuery).exec();
        return res
          .status(200)
          .json(boards);
      }
    } catch (err) {
      return next(err);
    }
  }
);



/**
 * @api {post} /api/board/ Create Board
 * @apiName CreateBoard
 * @apiGroup Board
 * @apiPermission admin
 * @apiDescription Create new board with parameters defined by object *data*.
 * Only data.uri is requiread to create board, other fields are optional and
 * can be changed later.
 * 
 * @apiParam (Board data) {Object} data Object with board data. Required.
 * 
 * @apiParam (Board data) {String} data.uri Board uri. Must contain only
 * letters, numbers or underscore (a-z, A-Z, 0-9, _). Letters will be
 * converted to lower case. Board uri is immutable. Required.
 *
 * @apiSuccessExample
 *     HTTP/1.1 201 Created
 *     Location: /b
 *     {
 *       "newThreadsRequired": {
 *         "files": false,
 *         "message": false,
 *         "subject": false
 *       },
 *       "captcha": {
 *         "enabled": false
 *       },
 *       "features": {
 *         "reporting": true,
 *         "archive": true,
 *         "catalog": true,
 *         "sage": true,
 *         "permanentSage": false
 *       },
 *       "name": "",
 *       "desc": "",
 *       "header": "",
 *       "imageUri": "",
 *       "faviconUri": "",
 *       "maxFileSize": 10485760,
 *       "maxFilesPerPost": 4,
 *       "maxThreadsOnPage": 10,
 *       "maxPages": 10,
 *       "autosage": 500,
 *       "showReplies": 5,
 *       "showRepliesSticky": 1,
 *       "maxMessageLength": 9001,
 *       "defaultPosterName": "Anonymous",
 *       "isLocked": false,
 *       "isHidden": false,
 *       "isForcedAnon": false,
 *       "defaultStyle": "",
 *       "locale": "en",
 *       "allowRepliesSubject": true,
 *       "filetypes": [],
 *       "postcount": 0,
 *       "uri": "b",
 *       "createdDate": "2019-01-12T03:40:59.741Z"
 *     }
 *
 * @apiError BoardAlreadyExists Attempt to create board with uri that already
 * taken
 * 
 * @apiError RequestValidationError data.uri is in blacklist or has incorrect
 * format
 * 
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * 
 * @apiErrorExample BoardAlreadyExists
 *     HTTP/1.1 409 Conflict
 *     {
 *       "error": {
 *         "type": "BoardAlreadyExists",
 *         "msg": "Board \"b\" already exists.",
 *         "param": "data.uri",
 *         "value": "b",
 *         "location": "body"
 *       }
 *     }
 *
 * @apiErrorExample RequestValidationError
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": {
 *         "location": "body",
 *         "param": "data.uri",
 *         "value": "!@#$%^&*",
 *         "msg": "Board uri must not be empty and can contain only letters and numbers or underscore",
 *         "type": "RequestValidationError"
 *       }
 *     }
 *
 * @apiUse BoardParams
 */
router.post(
  '/api/board/',
  [
    // access
    adminOnly,
    // validator
    body('data.uri', 'Board uri must not be empty and can contain only letters and numbers or underscore')
      .isLength({ min: 1 })
      .matches(/^[a-zA-Z0-9_]*$/),
    body('data.uri', 'This board uri is not allowed')
      .custom((v) => !boardparams.uriBlacklist.includes(v)),
    validateRequest,
    // filter request
    sanitizer.filterBody(['data']),
    sanitizer.filterBody(boardparams.newFields, 'data'),
  ],
  async (req, res, next) => {
    try {
      const boardData = req.body.data;
      const boardUri = boardData.uri;
      const boardExists = await Board.countDocuments({ uri: boardUri });
      if (boardExists) {
        return res.status(409).json({
          error: {
            type: 'BoardAlreadyExists',
            msg: `Board "${ boardUri }" already exists.`,
            param: 'data.uri',
            value: boardUri,
            location: 'body',
          }
        });
      }
      const board = await boardController.createBoard(req.body.data);
      return res.status(201)
        .location(`/${ board.uri }`)
        .json(_.omit(board.toObject(), ['_id', '__v']));
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {patch} /api/board/ Modify Board
 * @apiName ModifyBoard
 * @apiGroup Board
 * @apiPermission admin
 * @apiDescription Partially update parameters of board. Accepts object with
 * new values and changes board parameters accordingly. Returns response with
 * changes object, where keys are properties and values are arrays where first
 * element is original value and second is new value. If no changes were made,
 * returns 204 No Content status. All changes are recorded to ModLog.
 * 
 * @apiParam {Boolean} regenerate Wheteher or not to update assossiated HTML
 * files. Board pages are updated on every post, while thread pages are
 * updated only on reply to each thread. Choosing regenerate will update all
 * threads and bpard pages instantly.
 * 
 * @apiParam (Board data) {Object} data Object with board data.
 * 
 * @apiUse BoardParams
 *
 * @apiSuccessExample No changes were made
 *     HTTP/1.1 204 No Content
 *
 * @apiSuccessExample List of changes
 *     HTTP/1.1 200 OK
 *     {
 *       "name": ["Old name", "New name"],
 *       "desc": ["Previous lame description", "Brand new description"],
 *       "maxPages": [10, 20]
 *     }
 *
 * @apiErrorExample RequestValidationError
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": {
 *         "location": "params",
 *         "param": "uri",
 *         "value": "!@#$%^&*",
 *         "msg": "Board uri must not be empty and can contain only letters and numbers or underscore",
 *         "type": "RequestValidationError"
 *       }
 *     }
 * 
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse BoardNotFoundError
 */
router.patch(
  '/api/board/:uri?',
  [
    // access
    adminOnly,
    // validator
    check('uri', 'Board uri must not be empty and can contain only letters and numbers or underscore')
      .isLength({ min: 1 })
      .matches(/^[a-zA-Z0-9_]*$/),
    body('regenerate').toBoolean(),
    validateRequest,
    // filter request
    sanitizer.filterBody(['data', 'regenerate']),
    sanitizer.filterBody(boardparams.editableFields, 'data'),
  ],
  async (req, res, next) => {
    try {
      const boardUri = req.params.uri || req.body.uri;
      const board = await Board.findOne({ uri: boardUri });
      if (!board) {
        return res
          .status(404)
          .json({
            error: {
              type: 'BoardNotFound',
              msg: `Board "${ boardUri }" doesn't exist`,
              param: 'uri',
              value: boardUri,
              location: req.params.uri ? 'params' : 'body',
            }
          });
      }
      const {data, regenerate} = req.body;

      const changes = ModlogEntry.diff('Board', board._id, board.toObject(), data);
      if (!changes.length) {
        return res
          .status(204)
          .send();
      }
      const updatedBoard = await boardController.updateBoard(board, data, regenerate);
      const modlog = await ModlogEntry.create({
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        changes: changes,
        regenerate: regenerate,
      });
      const changeList = changes.reduce((result, change) =>
        ({...result, [change.property]: [change.oldValue, change.newValue]}), {});
      return res
        .status(200)
        .json(changeList);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {delete} /api/board/:uri? Delete Board
 * @apiName DeleteBoard
 * @apiGroup Board
 * @apiDescription This completely deletes board
 * and all posts on it from database as well as all files, including HTML of
 * threads, pages, catalog, archive and uploaded files. This action can not be
 * undone. Only admin can permanently delete boards.
 *
 * @apiPermission admin
 *
 * @apiParam {String} uri Board to delete.
 *
 * @apiSuccessExample Board successfully deleted
 *     HTTP/1.1 200 OK
 *     {
 *       "postsDeleted": 3,
 *       "boardsDeleted": 1
 *     }
 *
 * @apiUse BoardNotFoundError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 *
 * @apiError RequestValidationError Board uri has wrong format (must contain
 * only latin letters or numbers and underscore).
 *
 * @apiErrorExample RequestValidationError
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": {
 *         "location": "params",
 *         "param": "uri",
 *         "value": "фгсфдс",
 *         "msg": "Board uri can contain only letters and numbers or underscore",
 *         "type": "RequestValidationError"
 *       }
 *     }
 */
router.delete('/api/board/:uri?',
  [
    // access
    adminOnly,
    // validator
    check('uri', 'Board uri must not be empty and can contain only letters and numbers or underscore')
      .isLength({ min: 1 })
      .matches(/^[a-zA-Z0-9_]*$/),
    check('uri', 'This board uri is not allowed')
      .custom((v) => !boardparams.uriBlacklist.includes(v)),
    validateRequest,
    // filter request
    sanitizer.filterBody(['uri']),
  ],
  async (req, res, next) => {
    try {
      const uri = req.params.uri || req.body.uri;
      const board = await Board.findOne({ uri }, 'uri');
      if (!board) {
        return res
          .status(404)
          .json({
            error: {
              type: 'BoardNotFound',
              msg: `Board "${ uri }" doesn't exist`,
              param: 'uri',
              value: uri,
              location: req.params.uri ? 'params' : 'body',
            }
          });
      }
      const [ postsDeleted, boardsDeleted ] = await boardController.removeBoard(board);
      return res
        .status(200)
        .json({
          postsDeleted: postsDeleted,
          boardsDeleted: boardsDeleted,
        });
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
