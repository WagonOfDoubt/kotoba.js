const express = require('express');
const Board = require('../../models/board');

const router = express.Router();

router.get('/delboard/:board',
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

module.exports = router;
