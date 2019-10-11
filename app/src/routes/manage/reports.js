const express = require('express');
const Report = require('../../models/report');
const Board = require('../../models/board');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/reports',
  authRequired,
  async (req, res, next) => {
    try {
      let availableBoardsQuery = {};
      if (req.user.authority !== 'admin') {
        availableBoardsQuery = {
          boardUri: {
            $in: Array.from(req.user.boardRoles.keys()),
          }
        };
      }
      const boards = await Board.find(availableBoardsQuery, 'uri -_id' );

      // @todo implement filter by board
      let selectedBoards = boards;
      const boardsFilter = req.query.filter;
      if (boardsFilter && boardsFilter.length) {
        selectedBoards = selectedBoards.filter((b) => {
          return boardsFilter.includes(b.uri);
        });
      }

      const reportsLimit = 100;
      const reports = await Report
        .find()
        .sort({'createdAt': -1})
        .populate('posts')
        .limit(reportsLimit);

      res.render('manage/reports', {
        activity: 'manage-page-reports',
        title: 'Reports',
        reports: reports,
        boards: boards,
        selectedBoards: selectedBoards,
      });
    } catch(err) {
      next(err);
    }
  }
);

module.exports = router;
