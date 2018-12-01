const express = require('express');
const Board = require('../../models/board');

const router = express.Router();

router.get('/boardopts/:board?',
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

module.exports = router;
