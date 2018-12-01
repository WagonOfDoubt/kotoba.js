const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator/check');

const config = require('../config.json');

const dirSizes = require('../utils/dirstats');
const middlewares = require('../utils/middlewares');

const User = require('../models/user');
const Post = require('../models/post');
const News = require('../models/news');
const Board = require('../models/board');
const Settings = require('../models/settings');
const ModlogEntry = require('../models/modlog');

router.use(middlewares.globalTemplateVariables);


router.get('/manage/',
  middlewares.authRequired,
  async (req, res) => {
    res.render('manage/managepage');
  }
);

router.get('/manage/modlog/:before?',
  middlewares.authRequired,
  async (req, res, next) => {
    try {
      console.log(req.params);
      const q = req.params.before ? { timestamp: { $lt: req.params.before } } : {};
      const modlog = await ModlogEntry
        .find(q)
        .sort({ timestamp: -1})
        .limit(10)
        .populate([
          { path: 'changes.target' },
          { path: 'user', model: 'User' },
        ]);
      res.render('manage/modlog', {
        activity: 'manage-page-modlog',
        modlog: modlog,
        title: 'ModLog'
      });      
    } catch (e) {
      next(e);
    }
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

    if (!board) {
      res.status(404).send();
      return;
    }

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


router.get('/manage/uploads',
  middlewares.authRequired,
  async (req, res, next) => {
    try {
      const posts = await Post
        .find(
          {'attachments.0': { $exists: true }},
          {'attachments': 1, 'boardUri': 1, 'postId': 1, 'threadId': 1, 'timestamp': 1}
        )
        .sort({'timestamp': -1})
        .limit(500);
      res.render('manage/uploads', {
        activity: 'manage-page-upoads',
        title: 'Recent upoads',
        posts: posts,
      });
    } catch(err) {
      next(err);
    }
  }
);


router.get('/manage/profile',
  middlewares.authRequired,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      res.render('manage/profile', {
        activity: 'manage-page-profile',
        title: 'Profile',
        user: user
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/manage/staff/:userLogin?',
  middlewares.authRequired,
  async (req, res, next) => {
    try {
      let staffMember;
      if (req.params.userLogin) {
        staffMember = await User.findOne({ login: req.params.userLogin });
      }
      const staff = await User.find();
      res.render('manage/staff', {
        activity: 'manage-page-staff',
        title: 'Staff',
        staff: staff,
        staffMember: staffMember,
      });
    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
