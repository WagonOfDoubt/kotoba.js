const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');
const _ = require('lodash');

const boardController = require('../../controllers/board');
const Board = require('../../models/board');
const ModlogEntry = require('../../models/modlog');
const captchaProviders = require('../../captcha');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest, filterMatched } = require('../../middlewares/validation');
const boardparams = require('../../json/boardparams');
const { DocumentNotFoundError, DocumentAlreadyExistsError, DocumentNotModifiedError } = require('../../errors');
const locales = require('../../json/locales.json');
const localeCodes = locales.map(([t, c]) => c);


/**
 * @apiDefine BoardParams
 * @apiParam {String}   [data.name] Board title. If empty, board uri will be
 *    used.
 * @apiParam {String}   [data.desc] Board description.
 * @apiParam {String}   [data.header] HTML under board title in page header.
 * @apiParam {String}   [data.navbar] HTML of additional navigation menu under
 *    top links.
 * @apiParam {String[]} [data.imageUri] Array of URLs. Overrides the header
 *    image set in site settings. If left blank to use configured global
 *    header image.
 * @apiParam {String}   [data.faviconUri] Board favicon. Overrides default
 *    favicon. Leave blank to use default favicon.
 * @apiParam {Number}   [data.maxFileSize=10485760] Maximum size of uploaded
 *    images, in bytes.
 * @apiParam {Number}   [data.maxFilesPerPost=4] Maximum uploads in post. 0
 *    forbids any uploads making board text only.
 * @apiParam {Number}   [data.maxThreadsOnPage=10] How many threads are
 *    displayed on page.
 * @apiParam {Number}   [data.maxPages=10] Number of pages on board.
 * @apiParam {Number}   [data.showReplies=5] Number of replies to show on a
 *    board page.
 * @apiParam {Number}   [data.showRepliesSticky=1] Number of replies to show
 *    on a board page when the thread set as sticky.
 * @apiParam {Number}   [data.autosage=500] The number of replies a thread can
 *    have before autosaging. Also known as bump limit.
 * @apiParam {Number}   [data.maxMessageLength=9001] Maximum number of
 *    characters in post.
 * @apiParam {String}   [data.defaultPosterName="Anonymous"] Name to display
 *    when a name is not attached to a post.
 * @apiParam {Boolean}  [data.isLocked=false] Only moderators of the board and
 *    admin can make new posts/replies.
 * @apiParam {Boolean}  [data.isHidden=false] Do not display this board in
 *    navigation menu.
 * @apiParam {Boolean}  [data.isForcedAnon=false] If true, users will not be
 *    allowed to enter a name, forcing to use default instead.
 * @apiParam {String}   [data.defaultStyle] The style which will be set when
 *    the user first visits the board.
 * @apiParam {String}   [data.locale="en"] Locale to use on this board. Leave
 *    blank to use the locale defined in site settings.
 * @apiParam {Object}   [data.newThreadsRequired] Object with boolean values
 *    representing which fields are required for new threads.
 * @apiParam {Boolean}  [data.newThreadsRequired.files=false] If true, new
 *    threads will require at least one attachment.
 * @apiParam {Boolean}  [data.newThreadsRequired.message=false] If true, new
 *    threads will require message.
 * @apiParam {Boolean}  [data.newThreadsRequired.subject=false] If true, new
 *    threads will require subject.
 * @apiParam {Object}   [data.features] Object with boolean values
 *    representing which features on board turned on or off.
 * @apiParam {Boolean}  [data.features.reporting=true] Allow users to report
 *    posts.
 * @apiParam {Boolean}  [data.features.archive=true] Enable/disable thread
 *    archiving.
 * @apiParam {Boolean}  [data.features.catalog=true] Generate catalog.html.
 * @apiParam {Boolean}  [data.features.sage=true] Allow users to reply to
 *    threads without bumping them.
 * @apiParam {Boolean}  [data.features.permanentSage=false] If true, poster
 *    can only sage thread once. After that, they no longer can post in
 *    threads they saged.
 * @apiParam {Boolean}  [data.allowRepliesSubject=true] Display subject field
 *    in form for replying in thread.
 * @apiParam {Object}   [data.captcha] Captcha options
 * @apiParam {Boolean}  [data.captcha.enabled] Enable captcha
 * @apiParam {Boolean}  [data.captcha.unsolvedExpireTime=10] Number of minutes
 *    until unsolved captcha is removed and need to be refreshed
 * @apiParam {Boolean}  [data.captcha.replyExpireTime=0] Number of minutes
 *    when solved captcha is still valid after reply
 * @apiParam {Boolean}  [data.captcha.threadExpireTime=0] Number of minutes
 *    when solved captcha is still valid after creating new thread
 * @apiParam {Boolean}  [data.captcha.provider="wakabtcha"] Captcha provider.
 *    Currently supported is:
 *    - "wakabtcha" - default captcha from Wakaba
 */
const boardParamsValidator = {
  'data.name': {
    optional: true,
    trim: true,
    in: 'body',
  },
  'data.desc': {
    optional: true,
    trim: true,
    in: 'body',
  },
  'data.header': {
    optional: true,
    trim: true,
    in: 'body',
  },
  'data.navbar': {
    optional: true,
    trim: true,
    in: 'body',
  },
  'data.imageUri': {
    optional: true,
    trim: true,
    in: 'body',
  },
  'data.faviconUri': {
    optional: true,
    trim: true,
    in: 'body',
  },
  'data.maxFileSize': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.maxFilesPerPost': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.keepOriginalFileName': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.maxThreadsOnPage': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.maxPages': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.autosage': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.showReplies': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.showRepliesSticky': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.maxMessageLength': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.defaultPosterName': {
    optional: true,
    in: 'body',
  },
  'data.isLocked': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.isHidden': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.isForcedAnon': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.defaultStyle': {
    optional: true,
    trim: true,
    in: 'body',
  },
  'data.locale': {
    optional: true,
    isIn: {
      options: [localeCodes],
    },
    in: 'body',
  },
  'data.newThreadsRequired.files': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.newThreadsRequired.message': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.newThreadsRequired.subject': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.allowRepliesSubject': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.features.reporting': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.features.archive': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.features.catalog': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.features.sage': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.features.permanentSage': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.captcha.enabled': {
    optional: true,
    isBoolean: true,
    toBoolean: true,
    in: 'body',
  },
  'data.captcha.unsolvedExpireTime': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.captcha.replyExpireTime': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.captcha.threadExpireTime': {
    optional: true,
    isInt: true,
    toInt: true,
    in: 'body',
  },
  'data.captcha.provider': {
    optional: true,
    isIn: {
      options: Array.from(Object.keys(captchaProviders)),
    },
    in: 'body',
  },
};


/**
 * @apiDefine BoardUri
 * @apiParam {Object} data Object with board data. Required.
 * @apiParam {String} data.uri Board uri. Must contain only
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
 * @apiSuccessExample GET /api/board/b?select=createdAt,postcount:
 *     HTTP/1.1 200 OK
 *     {
 *       "postcount": 4815162342,
 *       "createdAt": "2019-01-12T17:37:55.337Z"
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
  filterMatched,
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
 *    Only data.uri is required to create board, other fields are optional and
 *    can be changed later.
 * @apiUse BoardUri
 * @apiUse BoardParams
 *
 * @apiSuccessExample
 *     HTTP/1.1 201 Created
 *     Location: /b
 *     {
 *       "name": "",
 *       "desc": "",
 *       "uri": "b",
 *       "createdAt": "2019-01-12T03:40:59.741Z",
 *       "newThreadsRequired": {
 *         ...
 *       },
 *       "captcha": {
 *         ...
 *       },
 *       "features": {
 *         ...
 *       },
 *       ...
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
  filterMatched,
  async (req, res, next) => {
    try {
      const { data } = req.body;
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
 * @apiParam {Boolean} regenerate Whether or not to update associated HTML
 *    files. Board pages are updated on every post, while thread pages are
 *    updated only on reply to each thread. Choosing regenerate will update
 *    all threads and board pages instantly.
 * @apiUse BoardUri
 * @apiUse BoardParams
 *
 * @apiSuccessExample
 *     HTTP/1.1 200 Success
 *     {
 *       "name": "",
 *       "desc": "",
 *       "uri": "b",
 *       "createdAt": "2019-01-12T03:40:59.741Z",
 *       "newThreadsRequired": {
 *         ...
 *       },
 *       "captcha": {
 *         ...
 *       },
 *       "features": {
 *         ...
 *       },
 *       ...
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
      in: 'body',
    },
    ...boardParamsValidator,
  }),
  validateRequest,
  filterMatched,
  async (req, res, next) => {
    try {
      const { data, regenerate } = req.body;
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
  filterMatched,
  async (req, res, next) => {
    try {
      const uri = req.body.uri;
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
