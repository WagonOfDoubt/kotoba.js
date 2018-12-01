const express = require('express');
const middlewares = require('../../utils/middlewares');
const { body, param, validationResult } = require('express-validator/check');
const News = require('../../models/news');

const router = express.Router();

router.get('/news/:newsId?',
  [
    param('newsId').optional().isNumeric(),
    middlewares.validateRedirect('/manage/news'),
  ],
  async (req, res, next) => {
    try {
      const newsId = req.params.newsId;
      const newsList = await News.find().sort({ postedDate: -1 });
      if (newsId) {
        const news = await News.findOne({ number: newsId });
        if (!news) {
          return res.redirect('/manage/news')
        }
        res.render('manage/news', {
          activity: 'manage-page-editnews',
          news: news,
          newsList: newsList,
          title: 'Edit news'
        });
      } else {
        res.render('manage/news', {
          activity: 'manage-page-addnews',
          newsList: newsList,
          title: 'Add news'
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
