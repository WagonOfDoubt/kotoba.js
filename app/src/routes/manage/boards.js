const express = require('express');
const Board = require('../../models/board');
const locales = require('../../json/locales');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/boards/',
  authRequired,
  async (req, res, next) => {
    try {
      const boards = await Board
        .find()
        .select('uri name desc createdDate isLocked isHidden isForcedAnon postcount')
        .exec();
      res.render('manage/boardselect', {
        activity: 'manage-page-boardselect',
        boards: boards,
        title: 'Board options',
        locales: locales,
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/boards/edit/:board',
  authRequired,
  async (req, res, next) => {
    try {
      const boardUri = req.params.board;
      const board = await Board.findOne({ uri: boardUri }).exec();
      res.render('manage/boardopts', {
        activity: 'manage-page-boardopts',
        board: board,
        boardDefaults: Board.defaults(),
        title: 'Board administration',
        locales: locales,
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/boards/create',
  authRequired,
  async (req, res, next) => {
    try {
      res.render('manage/boardopts', {
        activity: 'manage-page-addboard',
        boardDefaults: Board.defaults(),
        title: 'Add board',
        locales: locales,
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/boards/delete/:board',
  authRequired,
  async (req, res, next) => {
    try {
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
    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
