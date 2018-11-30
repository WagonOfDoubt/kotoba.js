const express = require('express');
const router = express.Router();
const { check, oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');

const News = require('../../models/news');
const middlewares = require('../../utils/middlewares');
const { generateMainPage } = require('../../controllers/generate');

// get news
router.get('/api/news/:newsId?',
  middlewares.adminOnly,
  async (req, res, next) => {
    try {
      const newsId = req.body.newsId || req.params.newsId;
      const news = newsId
        ? await News.findOne({ number: newsId }).exec()
        : await News.find().exec();
      res.json(news);
    } catch (err) {
      return next(err);
    }
  }
);


// create news
router.put(
  '/api/news/',
  [
    body('data', 'Request body is empty')
      .exists(),
    body('regenerate').toBoolean(),
    middlewares.adminOnly,
    middlewares.validateRequest
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


// modify news
router.patch(
  '/api/news/:newsId?',
  [
    check('newsId').isNumeric(),
    check('newsId').toInt(),
    body('data', 'Request body is empty').exists(),
    body('regenerate').toBoolean(),
    middlewares.adminOnly,
    middlewares.validateRequest
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


// delete news
router.delete('/api/news/:newsId?',
  [
    check('newsId').isNumeric(),
    check('newsId').toInt(),
    body('regenerate').toBoolean(),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      const newsId = req.body.newsId || req.params.newsId;
      const status = await News.findOne({ number: newsId }).remove().exec();
      const regenerate = req.body.regenerate;
      if (regenerate) {
        await generateMainPage();
      }
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
