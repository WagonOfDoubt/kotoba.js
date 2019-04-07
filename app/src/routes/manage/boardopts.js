const express = require('express');
const Board = require('../../models/board');
const locales = require('../../json/locales');

const router = express.Router();

router.get('/boardopts/:board?',
  async (req, res, next) => {
    try {
      const boardUri = req.params.board;
      if (boardUri) {
        const board = await Board.findOne({ uri: req.params.board }).exec();
        res.render('manage/boardopts', {
          activity: 'manage-page-boardopts',
          board: board,
          boardDefaults: Board.defaults(),
          title: 'Board administration',
          locales: locales,
        });
      } else {
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
      }
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
