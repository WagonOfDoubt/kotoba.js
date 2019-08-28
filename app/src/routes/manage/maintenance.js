const express = require('express');
const Board = require('../../models/board');
const router = express.Router();

router.get('/maintenance',
  async (req, res, next) => {
    try {
      const boards = await Board.findBoards().select('uri');
      res.render('manage/maintenance', {
        activity: 'manage-page-maintenance',
        title: 'Site maintenance',
        boards
      });
    } catch(err) {
      next(err);
    }
  }
);

module.exports = router;
