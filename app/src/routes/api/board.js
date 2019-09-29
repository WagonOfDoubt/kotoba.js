const express = require('express');
const router = express.Router();
const { checkSchema, matchedData } = require('express-validator');
const _ = require('lodash');

const boardController = require('../../controllers/board');
const Board = require('../../models/board');
const ModlogEntry = require('../../models/modlog');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');
const boardparams = require('../../json/boardparams');
const { DocumentNotFoundError, DocumentAlreadyExistsError, DocumentNotModifiedError } = require('../../errors');
const locales = require('../../json/locales.json');
const localeCodes = locales.map(([t, c]) => c);


/**
 * @apiDefine BoardParams
 * @apiParam (Board data) {String} data.name="" Board title. If empty, board
 *    uri will be used.
 * @apiParam (Board data) {String} data.desc="" Board description.
 * @apiParam (Board data) {String} data.header="" HTML under board title in
 *    page header.
 * @apiParam (Board data) {String} data.navbar="" HTML of additional
 *    navigation menu under top links.
 * @apiParam (Board data) {String[]} data.imageUri Array of URLs. Overrides
 *    the header image set in site settings. If left blank to use configured
 *    global header image.
 * @apiParam (Board data) {String} data.faviconUri Board favicon. Overrides
 *    default favicon. Leave blank to use default favicon.
 * @apiParam (Board data) {Number} data.maxFileSize=10485760 Maximum size of
 *    uploaded images, in bytes.
 * @apiParam (Board data) {Number} data.maxFilesPerPost=4 Maximum uploads in
 *    post. 0 forbids any uploads making board text only.
 * @apiParam (Board data) {Number} data.maxThreadsOnPage=10 How many threads
 *    are displayed on page.
 * @apiParam (Board data) {Number} data.maxPages=10 Number of pages on board.
 * @apiParam (Board data) {Number} data.showReplies=5 Number of replies to
 *    show on a board page.
 * @apiParam (Board data) {Number} data.showRepliesSticky=1 Number of replies
 *    to show on a board page when the thread set as sticky.
 * @apiParam (Board data) {Number} data.autosage=500 The number of replies a
 *    thread can have before autosaging. Also known as bump limit.
 * @apiParam (Board data) {Number} data.maxMessageLength=9001 Maximum number
 *    of characters in post.
 * @apiParam (Board data) {String} data.defaultPosterName="Anonymous" Name to
 *    display when a name is not attached to a post.
 * @apiParam (Board data) {Boolean} data.isLocked=false Only moderators of the
 *    board and admin can make new posts/replies.
 * @apiParam (Board data) {Boolean} data.isHidden=false Do not display this
 *    board in navigation menu.
 * @apiParam (Board data) {Boolean} data.isForcedAnon=false If true, users
 *    will not be allowed to enter a name, forcing to use default instead.
 * @apiParam (Board data) {String} data.defaultStyle="" The style which will
 *    be set when the user first visits the board.
 * @apiParam (Board data) {String} data.locale="en" Locale to use on this
 *    board. Leave blank to use the locale defined in site settings.
 * @apiParam (Board data) {Object} data.newThreadsRequired Object with boolean
 *    values representing which fields are required for new threads.
 * @apiParam (Board data) {Boolean} data.newThreadsRequired.files=false If
 *    true, new threads will require at least one attachment.
 * @apiParam (Board data) {Boolean} data.newThreadsRequired.message=false If
 *    true, new threads will require message.
 * @apiParam (Board data) {Boolean} data.newThreadsRequired.subject=false If
 *    true, new threads will require subject.
 * @apiParam (Board data) {Object} data.features Object with boolean values
 *    representing which features on board turned on or off.
 * @apiParam (Board data) {Boolean} data.features.reporting=true Allow users
 *    to report posts.
 * @apiParam (Board data) {Boolean} data.features.archive=true Enable/disable
 *    thread archiving.
 * @apiParam (Board data) {Boolean} data.features.catalog=true Generate
 *    catalog.html.
 * @apiParam (Board data) {Boolean} data.features.sage=true Allow users to
 *    reply to threads without bumping them.
 * @apiParam (Board data) {Boolean} data.features.permanentSage=false If true,
 *    poster can only sage thread once. After that, they no longer can post in
 *    threads they saged.
 * @apiParam (Board data) {Boolean} data.allowRepliesSubject=true Display
 *    subject field in form for replying in thread.
 * @apiParam (Board data) {Object} data.captcha Captcha options
 * @apiParam (Board data) {Boolean} data.captcha.enabled Enable captcha
 * @apiParam (Board data) {Boolean} data.captcha.unsolvedExpireTime Number of
 *    minutes until unsolved captcha is removed and need to be refreshed
 * @apiParam (Board data) {Boolean} data.captcha.replyExpireTime Number of
 *    minutes when solved captcha is still valid after reply
 * @apiParam (Board data) {Boolean} data.captcha.threadExpireTime Number of
 *    minutes when solved captcha is still valid after creating new thread
 * @apiParam (Board data) {Boolean} data.captcha.provider Captcha provider.
 *    Currently supported is: "wakabtcha" - default captcha from Wakaba
 */
const boardParamsValidator = {
  'data.name': {
    optional: true,
    trim: true,
  },
  'data.desc': {
    optional: true,
    trim: true,
  },
  'data.header': {
    optional: true,
    trim: true,
  },
  'data.navbar': {
    optional: true,
    trim: true,
  },
  'data.imageUri': {
    optional: true,
    trim: true,
  },
  'data.faviconUri': {
    optional: true,
    trim: true,
  },
  'data.maxFileSize': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.maxFilesPerPost': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.maxThreadsOnPage': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.maxPages': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.autosage': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.showReplies': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.showRepliesSticky': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.maxMessageLength': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.defaultPosterName': {
    optional: true,
  },
  'data.isLocked': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.isHidden': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.isForcedAnon': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.defaultStyle': {
    optional: true,
    trim: true,
  },
  'data.locale': {
    optional: true,
    isIn: {
      options: [localeCodes],
    }
  },
  'data.newThreadsRequired.files': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.newThreadsRequired.message': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.newThreadsRequired.subject': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.allowRepliesSubject': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.features.reporting': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.features.archive': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.features.catalog': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.features.sage': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.features.permanentSage': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.captcha.enabled': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
  },
  'data.captcha.unsolvedExpireTime': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.captcha.replyExpireTime': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.captcha.threadExpireTime': {
    optional: true,
    isInt: true,
    toInt: true,
  },
  'data.captcha.provider': {
    optional: true,
  },
};


/**
 * @apiDefine BoardUri
 * @apiParam (Board data) {Object} data Object with board data. Required.
 * @apiParam (Board data) {String} data.uri Board uri. Must contain only
 * letters, numbers or underscore (a-z, A-Z, 0-9, _). Letters will be
 * converted to lower case. Board uri is immutable. Required.
 */
const _boardUriValidator = {
  in: 'body',
  isLength: {
    options: { min: 1 },
    errorMessage: 'Board uri must not be empty',
  },
  matches: {
    options: [/^[a-zA-Z0-9_]*$/],
    errorMessage: 'Board uri can contain only letters and numbers or underscore',
  },
  custom: {
    options: (v) => !boardparams.uriBlacklist.includes(v),
    errorMessage: 'This board uri is not allowed',
  },
};


/**
 * @api {get} /api/board/:uri? Get Boards
 * @apiName GetBoard
 * @apiGroup Board
 * @apiPermission anyone
 * @apiParam (params) {String} uri="" Optional. If specified, returns one
 *    board object. If empty, returns array of all boards.
 * @apiParam (query) {String} select Optional. Comma-separated values that
 *    define which parameters of board to return. If empty, default set of
 *    params will be returned, as shown below. If equals "!all", all
 *    parameters will be returned.
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
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 */
router.get(
  '/api/board/:uri?',
  checkSchema({
    uri: {
      in: 'params',
      optional: true,
      isLength: {
        options: { min: 1 },
        errorMessage: 'Board uri must not be empty',
      },
      matches: {
        options: [/^[a-zA-Z0-9_]*$/],
        errorMessage: 'Board uri can contain only letters and numbers or underscore',
      },
      custom: {
        options: (v) => !boardparams.uriBlacklist.includes(v),
        errorMessage: 'This board uri is not allowed',
      },
    },
    select: {
      in: 'query',
      optional: true,
    }
  }),
  validateRequest,
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
          const e = new DocumentNotFoundError('Board', 'uri', boardUri, 'params');
          return e.respond(res);
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
 * Only data.uri is required to create board, other fields are optional and
 * can be changed later.
 * @apiUse BoardUri
 * @apiUse BoardParams
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
 *       "navbar": "",
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
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse DocumentAlreadyExistsError
 * @apiUse RequestValidationError
 */
router.post(
  '/api/board/',
  // access
  adminOnly,
  // validator
  checkSchema({
    'data.uri': _boardUriValidator,
    ...boardParamsValidator,
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { data } = matchedData(req);
      const boardUri = data.uri;
      const boardExists = await Board.findOne({ uri: boardUri });
      if (boardExists) {
        const e = new DocumentAlreadyExistsError('Board', 'data.uri', boardUri, 'body');
        return e.respond(res);
      }
      const board = await boardController.createBoard(data);
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
 *    new values and changes board parameters accordingly. All changes are
 *    recorded to ModLog.
 * @apiParam (options) {Boolean} regenerate Whether or not to update
 *    associated HTML files. Board pages are updated on every post, while
 *    thread pages are updated only on reply to each thread. Choosing
 *    regenerate will update all threads and board pages instantly.
 * @apiUse BoardUri
 * @apiUse BoardParams
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
 *       "navbar": "",
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
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse RequestValidationError
 * @apiUse DocumentNotFoundError
 * @apiUse DocumentNotModifiedError
 */
router.patch(
  '/api/board/',
  // access
  adminOnly,
  // validator
  checkSchema({
    'data.uri': _boardUriValidator,
    'regenerate': {
      isBoolean: true,
      toBoolean: true,
    },
    ...boardParamsValidator,
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const matched = matchedData(req);
      const { data, regenerate } = matched;
      const boardUri = data.uri;
      const board = await Board.findOne({ uri: boardUri });
      if (!board) {
        const e = new DocumentNotFoundError('Board', 'data.uri', boardUri, 'body');
        return e.respond(res);
      }
      const changes = ModlogEntry.diff('Board', board._id, board.toObject(), data);
      if (!changes.length) {
        const e = new DocumentNotModifiedError('Board', 'data.uri', data.uri, 'body');
        return e.respond(res);
      }
      const boardUpdateResult = await boardController.updateBoard(board, data, regenerate);
      await ModlogEntry.create({
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        changes: changes,
        regenerate: regenerate,
      });
      return res
        .status(200)
        .json(boardUpdateResult);
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
 * @apiPermission admin
 *
 * @apiParam {String} uri Board to delete.
 *
 * @apiSuccessExample Board successfully deleted
 *     HTTP/1.1 200 OK
 *     {
 *       "postsDeleted": 3
 *     }
 *
 * @apiUse DocumentNotFoundError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse RequestValidationError
 */
router.delete('/api/board/',
  // access
  adminOnly,
  // validator
  checkSchema({
    'uri': _boardUriValidator,
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const matched = matchedData(req);
      const uri = matched.uri;
      const board = await Board.findOne({ uri }, 'uri');
      if (!board) {
        const e = new DocumentNotFoundError('Board', 'uri', uri, req.params.uri ? 'params' : 'body');
        return e.respond(res);
      }
      const [ postsDeleted ] = await boardController.removeBoard(board);
      return res
        .status(200)
        .json({
          postsDeleted: postsDeleted,
        });
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
