const express = require('express');
const router = express.Router();
const { check, body, checkSchema, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');

const News = require('../../models/news');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');
const { generateMainPage } = require('../../controllers/generate');
const { RequestValidationError, DocumentNotFoundError } = require('../../errors');
const sanitizer = require('../../middlewares/sanitizer');


/**
 * @api {get} /api/news/:newsId? Get news
 * @apiName GetNews
 * @apiGroup News
 * @apiPermission anyone
 * 
 * @apiDescription Get news document(s)
 * 
 * @apiParam {Number} newsId [params] Sequential number of news entry. If
 *    this parameter present, one document will be returned.
 * @apiParam {Number} skip [query] How many newest documents to skip. Default
 *    is 0.
 * @apiParam {Number} limit [query] How many documents to return. Default is
 *    10. Must be in rage [1-50].
 *
 * @apiSuccessExample GET /api/board/:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "subject": "Breaking news!",
 *         "message": "Something happened!",
 *         "postedby": "Administrator",
 *         "postedemail": "nomad@ag.ru",
 *         "postedDate": "2019-01-08T02:05:56.466Z",
 *         "number": 7
 *       },
 *       {
 *         "subject": "Don't you know about the bird?",
 *         "message": "Everybody knows that the bird is the word!",
 *         "postedby": "Administrator",
 *         "postedemail": "nomad@ag.ru",
 *         "postedDate": "2018-09-18T20:51:34.574Z",
 *         "number": 6
 *       },
 *       ...
 *     ]
 *
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 */
router.get('/api/news/:newsId?',
  checkSchema({
    newsId: {
      in: 'params',
      optional: true,
      isInt: true,
      toInt: true,
    },
    skip: {
      in: 'query',
      optional: true,
      isInt: true,
      toInt: true,
    },
    limit: {
      in: 'query',
      optional: true,
      isInt: {
        errorMessage: 'limit must be an integer in rage 1-50',
        options: {
          min: 1,
          max: 50,          
        }
      },
      toInt: true,
    }
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const newsId = req.body.newsId || req.params.newsId;
      if (newsId) {
        const news = await News.findOne({ number: newsId }).exec();
        if (!news) {
          const e = new DocumentNotFoundError('News', 'number', newsId, 'params');
          return e.respond(res);
        }
        return res.json(news);
      } else {
        const skip = parseInt(req.query.skip || 0);
        const limit = parseInt(req.query.limit || 0);
        const newsArr = await News.find()
          .sort({ postedDate: -1 })
          .select('-_id -__v')
          .skip(skip)
          .limit(limit)
          .exec();
        res.json(newsArr);
      }
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @apiDefine NewsParams
 * @apiParam {Object} data News entry data
 * @apiParam {String} data.subject Entry subject
 * @apiParam {String} data.message Entry message
 * @apiParam {String} data.postedby Who posted this entry
 * @apiParam {String} data.postedemail E-mail of poster
 */


/**
 * @api {post} /api/news/ Create news
 * @apiName CreateNews
 * @apiGroup News
 * @apiPermission admin
 * 
 * @apiDescription Create news entry
 * 
 * @apiUse NewsParams
 * @apiParam {Boolean} regenerate Whether or not to regenerate main page
 * 
 * @apiSuccessExample POST /api/board/:
 *     HTTP/1.1 200 OK
 *     {
 *       "subject": "Breaking news!",
 *       "message": "Something happened!",
 *       "postedby": "Administrator",
 *       "postedemail": "nomad@ag.ru",
 *       "postedDate": "2019-01-08T02:05:56.466Z",
 *       "number": 7
 *     }
 *
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 */
router.post(
  '/api/news/',
  [
    body('data', 'Request body is empty')
      .exists(),
    body('regenerate').toBoolean(),
    adminOnly,
    validateRequest,
    sanitizer.filterBody(['data', 'regenerate']),
    sanitizer.filterBody(['subject', 'message', 'postedby', 'postedemail'], 'data'),
  ],
  async (req, res, next) => {
    try {
      console.log(req.body);
      const news = new News(req.body.data);
      await news.save();
      const regenerate = req.body.regenerate;
      if (regenerate) {
        await generateMainPage();
      }
      res.json(news);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {post} /api/news/ Modify news
 * @apiName ModifyNews
 * @apiGroup News
 * @apiPermission admin
 * 
 * @apiDescription Modify news entry
 * 
 * @apiUse NewsParams
 * @apiParam {Boolean} regenerate Whether or not to regenerate main page
 *
 * @apiSuccessExample POST /api/board/:
 *     HTTP/1.1 200 OK
 *     {
 *       "subject": "Breaking news!",
 *       "message": "Something happened!",
 *       "postedby": "Administrator",
 *       "postedemail": "nomad@ag.ru",
 *       "postedDate": "2019-01-08T02:05:56.466Z",
 *       "number": 7
 *     }
 *
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 */
router.patch(
  '/api/news/:newsId?',
  [
    check('newsId').isNumeric(),
    check('newsId').toInt(),
    body('data', 'Request body is empty')
      .exists(),
    body('regenerate').toBoolean(),
    adminOnly,
    validateRequest,
    sanitizer.filterBody(['data', 'regenerate']),
    sanitizer.filterBody(['subject', 'message', 'postedby', 'postedemail'], 'data'),
  ],
  async (req, res, next) => {
    try {
      const newsId = req.body.newsId || req.params.newsId;
      const news = await News.findOneAndUpdate(
        { number: newsId },
        { $set: req.body.data },
        { new: true });
      const regenerate = req.body.regenerate;
      if (regenerate) {
        await generateMainPage();
      }
      res.json(news);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {delete} /api/news/:newsId? Delete news
 * @apiName DeleteNews
 * @apiGroup News
 * @apiPermission admin
 * 
 * @apiDescription Delete news document
 * 
 * @apiParam {Number} newsId [params] Sequential number of news entry
 * @apiParam {Boolean} regenerate Whether or not to regenerate main page
 *
 * @apiSuccessExample POST /api/board/:
 *     HTTP/1.1 200 OK
 *     {
 *       "subject": "Breaking news!",
 *       "message": "Something happened!",
 *       "postedby": "Administrator",
 *       "postedemail": "nomad@ag.ru",
 *       "postedDate": "2019-01-08T02:05:56.466Z",
 *       "number": 7
 *     }
 *
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 */
router.delete('/api/news/:newsId?',
  [
    adminOnly,
    check('newsId').isNumeric(),
    check('newsId').toInt(),
    body('regenerate').toBoolean(),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      const newsId = req.body.newsId || req.params.newsId;
      const status = await News.findOneAndDelete({ number: newsId }).exec();
      if (!status) {
        const e = new DocumentNotFoundError('News', 'number', newsId, 'params');
        return e.respond(res);
      }
      const regenerate = req.body.regenerate;
      if (regenerate) {
        await generateMainPage();
      }
      return res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
