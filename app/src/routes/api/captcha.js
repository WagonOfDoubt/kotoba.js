/**
 * Captcha api endpoint
 * @module routes/api/captcha
 */

const express = require('express');
const router = express.Router();
const { checkSchema, matchedData } = require('express-validator');
const { validateRequest } = require('../../middlewares/validation');

const captchaProviders = require('../../captcha');
const Captcha = require('../../models/captcha');
const Board = require('../../models/board');
const { DocumentNotFoundError, UnknownError,
  CaptchaEntryNotFoundError, IncorrectCaptchaError } = require('../../errors');


/**
 * @apiDefine Captcha_params
 * @apiParam (params) {String} boardUri Board on which action is performed
 * @apiParam (params) {String} action Action that is being validated:
 *    "reply" for posting a reply to thread, "thread" for crating new thread
 */
const captchaParamsValidators = {
  boardUri: {
    in: 'params',
    isLength: {
      options: { min: 1 },
      errorMessage: 'Board uri must not be empty',
    },
    matches: {
      options: [/^[a-zA-Z0-9_]*$/],
      errorMessage: 'Board uri can contain only letters and numbers or underscore',
    },
  },
  action: {
    in: 'params',
    isIn: {
      options: [['reply', 'thread']],
      errorMessage: 'Action must me "reply" or "thread"',
    },
  },
};


/**
 * @apiDefine Captcha_query
 * @apiParam (query) {Boolean} raw If true, return raw image data, if false or
 *    omitted, return JSON
 * @apiParam (query) {Boolean} lookup If true, don't generate new captcha
 *    answer and image, just return current status (expireAt and isSolved)
 */
const captchaQueryValidator = {
  raw: {
    in: 'query',
    isBoolean: true,
    toBoolean: true,
    optional: true,
  },
  lookup: {
    in: 'query',
    isBoolean: true,
    toBoolean: true,
    optional: true,
  }
};


/**
 * @api {get} /api/captcha/:boardUri/:action Get captcha
 * @apiName GetCaptcha
 * @apiGroup Captcha
 * @apiPermission anyone
 * @apiDescription Request captcha challenge. Type of captcha depends on board
 *    settings. Unsolved captcha has limited lifetime depending on settings.
 *    Solved captcha will be still valid for set time. Cookies must be enabled
 *    or captcha won't work without it. New captcha is generated every time
 *    this api is accessed unless captcha is already solved or lookup flag is
 *    set in query.
 * @apiUse Captcha_params
 * @apiUse Captcha_query
 * @apiSuccess {String} expireAt Date when captcha will be deleted
 * @apiSuccess {String} key Captcha key (boardUri and action in one string)
 * @apiSuccess {Boolean} isSolved Whether or not captcha already was correctly
 *    entered by user
 * @apiSuccess {String} image Base64 encoded captcha image (present only if
 *    captcha is not solved)
 * @apiUse RequestValidationError
 * @apiUse DocumentNotFoundError
 * @apiSuccessExample Captcha already solved
 *     HTTP/1.1 200 OK
 *     {
 *       "key": "reply.c",
 *       "expireAt": "2007-01-01T02:55:42.228Z",
 *       "isSolved": true
 *     }
 * @apiSuccessExample Captcha not yet solved
 *     HTTP/1.1 200 OK
 *     {
 *       "image": "data:image/gif;base64,...",
 *       "key": "reply.c",
 *       "expireAt": "2007-01-01T02:55:42.228Z",
 *       "isSolved": false
 *     }
 * @apiSuccessExample lookup flag is set
 *     HTTP/1.1 200 OK
 *     {
 *       "key": "reply.c",
 *       "expireAt": "2007-01-01T02:55:42.228Z",
 *       "isSolved": true
 *     }
 * @apiSuccessExample raw flag is set
 *     HTTP/1.1 200 OK
 *     Content-Type: image/gif
 *     <binary image>
 * @apiSuccessExample Captcha is not required for board
 *     HTTP/1.1 200 OK
 *     {
 *       "isSolved": true
 *     }
 */
router.get('/api/captcha/:boardUri/:action',
  checkSchema({
    ...captchaParamsValidators, 
    ...captchaQueryValidator
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const data = matchedData(req, { locations: ['params', 'query'] });
      const { action, boardUri } = data;

      if (data.lookup) {
        const response = await Captcha.lookup(req.session.id, action, boardUri);
        return res.status(200).json(response);
      }

      const board = await Board.findBoard(boardUri);
      if (!board) {
        const boardNotFound = new DocumentNotFoundError('Board', 'boardUri', boardUri, 'params');
        return boardNotFound.respond(res);
      }
      const captchaParams = board.captcha.toObject();
      if (!captchaParams || !captchaParams.enabled) {
        return res.status(200).json({
          isSolved: true,
        });
      }

      const provider = captchaProviders[captchaParams.provider];
      if (!provider) {
        const wtfError = new UnknownError('Captcha provider is missing');
        return wtfError.respond(res);
      }

      const captchaText = provider.generateAnswer();
      const captchaResult = await Captcha.refresh(captchaText, req.session.id,
        action, boardUri, captchaParams.unsolvedExpireTime);
      if (data.raw) {
        const imgText = captchaResult.isSolved ? 'captcha ok' : captchaText;
        const capthcaImage = provider.generateImage(imgText);
        res.set('Content-Type', provider.mimeType);
        return res.status(200).send(capthcaImage);
      }
      if (!captchaResult.isSolved) {
        const capthcaImage = provider.generateImage(captchaText);
        return res.status(200).send({
          image: `data:${provider.mimeType};base64,${capthcaImage.toString('base64')}`,
          ...captchaResult
        });
      }
      return res.status(200).send(captchaResult);
    } catch (err) {
      next(err);
    }
  }
);


/**
 * @api {get} /api/captcha/:boardUri/:action Validate captcha
 * @apiName CheckCaptcha
 * @apiGroup Captcha
 * @apiPermission anyone
 * @apiDescription Check captcha entered by user. Correctly answered captcha
 *    remains valid for amount of time defined in board settings. If captcha
 *    is already solved, there will be no error even if current answer is
 *    incorrect.
 * @apiUse Captcha_params
 * @apiParam (body) {String} answer Captcha answer
 * @apiUse RequestValidationError
 * @apiUse DocumentNotFoundError
 * @apiUse CaptchaEntryNotFoundError
 * @apiUse IncorrectCaptchaError
 * @apiSuccessExample Captcha entered correctly
 *     HTTP/1.1 200 OK
 *     {
 *       "key": "reply.c",
 *       "expireAt": "2007-01-01T02:55:42.228Z",
 *       "isSolved": true
 *     }
 * @apiSuccessExample Captcha is not required for board
 *     HTTP/1.1 200 OK
 *     {
 *       "isSolved": true
 *     }
 */
router.post('/api/captcha/:boardUri/:action',
  checkSchema({
    ...captchaParamsValidators,
    answer: {
      in: 'body',
      isLength: {
        errorMessage: 'Captcha answer is empty or too long',
        options: {
          min: 1,
          max: 64
        },
      },
      trim: true,
    },
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const data = matchedData(req, { locations: ['params', 'body'] });
      const { action, boardUri, answer } = data;

      const board = await Board.findBoard(boardUri);
      if (!board) {
        const boardNotFound = new DocumentNotFoundError('Board', 'boardUri', boardUri, 'params');
        return boardNotFound.respond(res);
      }
      const captchaParams = board.captcha.toObject();
      if (!captchaParams || !captchaParams.enabled) {
        return res.status(200).json({
          isSolved: true,
        });
      }

      const solvedExpireTime = action === 'thread' ?
        captchaParams.threadExpireTime :
        captchaParams.replyExpireTime;

      const captchaEntry = await Captcha.validate(answer, req.session.id,
        action, boardUri, solvedExpireTime);
      if (captchaEntry === null) {
        const captchaErr = new CaptchaEntryNotFoundError('captcha', answer, 'body');
        return captchaErr.respond(res);
      }
      if (!captchaEntry.isSolved) {
        const captchaErr = new IncorrectCaptchaError('captcha', answer, 'body');
        return captchaErr.respond(res);
      }

      return res.status(200).json(captchaEntry);
    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
