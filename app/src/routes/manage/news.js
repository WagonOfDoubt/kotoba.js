const express = require('express');
const { validateRedirect } = require('../../middlewares/validation');
const { param } = require('express-validator');
const News = require('../../models/news');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/news/',
  authRequired,
  async (req, res, next) => {
    try {
      const newsList = await News.find().sort({ createdAt: -1 });
      res.render('manage/news', {
        activity: 'manage-page-editnews',
        newsList: newsList,
        title: 'News',
        crud: 'read',
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/news/edit/:newsId',
  authRequired,
  param('newsId').isNumeric(),
  validateRedirect('/manage/news'),
  async (req, res, next) => {
    try {
      const newsId = req.params.newsId;
      const news = await News.findOne({ number: newsId });
      if (!news) {
        return res.redirect('/manage/news');
      }
      res.render('manage/news', {
        activity: 'manage-page-editnews',
        news: news,
        title: 'Edit news',
        crud: 'update',
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/news/create',
  authRequired,
  async (req, res, next) => {
    try {
      res.render('manage/news', {
        activity: 'manage-page-addnews',
        title: 'Add news',
        crud: 'create',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
