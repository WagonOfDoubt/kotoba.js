const express = require('express');
const Board = require('../../models/board');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/delboard/:board',
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
