const express = require('express');
const Board = require('../../models/board');
const locales = require('../../json/locales');

const router = express.Router();

router.get('/addboard',
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

module.exports = router;
