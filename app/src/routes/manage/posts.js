const express = require('express');
const Post = require('../../models/post');
const Board = require('../../models/board');

const router = express.Router();

router.get('/posts',
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

      const postsQuery = {
        boardUri: {
          $in: selectedBoards.map(b => b.uri),
        },
      };

      const postsLimit = 100;
      const posts = await Post
        .find(postsQuery)
        .sort({'timestamp': -1})
        .limit(postsLimit);

      res.render('manage/posts', {
        activity: 'manage-page-posts',
        title: 'Recent posts',
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
