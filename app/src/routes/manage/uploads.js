const express = require('express');
const Post = require('../../models/post');
const Board = require('../../models/board');


const router = express.Router();

router.get('/uploads',
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

      let selectedBoards = boards;
      const boardsFilter = req.query.filter;
      if (boardsFilter && boardsFilter.length) {
        selectedBoards = selectedBoards.filter((b) => {
          return boardsFilter.includes(b.uri);
        });
      }

      const uploadsLimit = 100;
      const posts = await Post
        .find(
          {
            boardUri: {
              $in: selectedBoards.map(b => b.uri),
            },
            'attachments.0': {
              $exists: true
            }
          },
          {
            attachments: 1,
            boardUri: 1,
            postId: 1,
            threadId: 1,
            timestamp: 1
          }
        )
        .sort({'timestamp': -1})
        .limit(uploadsLimit);
      res.render('manage/uploads', {
        activity: 'manage-page-upoads',
        title: 'Recent uploads',
        posts: posts,
        boards: boards,
        selectedBoards: selectedBoards,
      });
    } catch(err) {
      next(err);
    }
  }
);

module.exports = router;
