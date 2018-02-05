const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator/check');

const config = require('../config.json');

const dirSizes = require('../utils/dirstats');
const middlewares = require('../utils/middlewares');

const User = require('../models/user');
const News = require('../models/news');
const Board = require('../models/board');
const Settings = require('../models/settings');

router.use(middlewares.globalTemplateVariables);

router.get('/manage/registration', (req, res) => {
  res.render('registrationpage');
});


router.get('/manage/',
  middlewares.authRequired,
  async (req, res) => {
    res.render('manage/managepage');
  }
);

router.get('/manage/spaceused',
  middlewares.authRequired,
  async (req, res) => {
    const dirStats = await dirSizes(config.html_path);
    res.render('manage/spaceused', {
      activity: 'manage-page-spaceused',
      dirStats: dirStats,
      title: 'Disk Space Used'
    });
  }
);

router.get('/manage/boardopts/:board?',
  middlewares.authRequired,
  async (req, res) => {
    const boardUri = req.params.board;
    if (boardUri) {
      const board = await Board.findOne({ uri: req.params.board }).exec();
      res.render('manage/boardopts', {
        activity: 'manage-page-boardopts',
        board: board,
        boardDefaults: Board.defaults(),
        title: 'Board administration'
      });
    } else {
      const boards = await Board.find().select('uri name').exec();
      res.render('manage/boardselect', {
        activity: 'manage-page-boardselect',
        boards: boards,
        title: 'Board options'
      });      
    }
  }
);

router.get('/manage/addboard',
  middlewares.authRequired,
  async (req, res) => {
    res.render('manage/boardopts', {
      activity: 'manage-page-addboard',
      boardDefaults: Board.defaults(),
      title: 'Add board'
    });
  }
);

router.get('/manage/delboard/:board',
  middlewares.authRequired,
  async (req, res) => {
    const board = await Board.findOne({ uri: req.params.board }).exec();

    res.render('manage/delboard', {
      activity: 'manage-page-delboard',
      board: board,
      title: 'Delete board'
    });
  }
);


router.get('/manage/news/:newsId?',
  [
    param('newsId').optional().isNumeric(),
    middlewares.validateRedirect('/manage/news'),
    middlewares.authRequired
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


router.get('/manage/sitesettings',
  middlewares.authRequired,
  async (req, res, next) => {
    try {
      const settings = await Settings.get();
      res.render('manage/sitesettings', {
        activity: 'manage-page-sitesettings',
        sitesettings: settings.toObject({ minimized: false }),
        defaults: Settings.defaults(),
        title: 'Site settings'
      });
    } catch(err) {
      next(err);
    }
  }
);


router.get('/manage/maintenance',
  middlewares.authRequired,
  async (req, res, next) => {
    try {
      res.render('manage/maintenance', {
        activity: 'manage-page-maintenance',
        title: 'Site maintenance'
      });
    } catch(err) {
      next(err);
    }
  }
);


module.exports = router;
