const express = require('express');
const Asset = require('../../models/asset');
const Post = require('../../models/post');
const Board = require('../../models/board');
const Report = require('../../models/report');
const { authRequired } = require('../../middlewares/permission');

const router = express.Router();

router.get('/trash',
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
      const postsQuery = {
        boardUri: {
          $in: boards.map(b => b.uri),
        },
        isDeleted: true,
      };

      const deletedAssets = await Asset.find({ isDeleted: true }).exec();
      const deletedPosts = await Post.find(postsQuery).sort({'timestamp': -1});
      const deletedReports = await Report.find({ isDeleted: true }).exec();

      res.render('manage/trash', {
        activity: 'manage-page-trash',
        numberOfDeletedAssets: deletedAssets.length,
        numberOfDeletedPosts: deletedPosts.length,
        numberOfDeletedReports: deletedReports.length,
        title: 'Recycle Bin'
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/trash/posts',
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
        isDeleted: true,
      };

      const postsLimit = 100;
      const posts = await Post
        .find(postsQuery)
        .sort({'timestamp': -1})
        .limit(postsLimit);

      const deletedAssets = await Asset.find({ isDeleted: true }).exec();
      const deletedPosts = await Post.find({ isDeleted: true }).exec();

      res.render('manage/trash', {
        activity: 'manage-page-trash',
        deletedPosts: posts,
        boards: boards,
        selectedBoards: selectedBoards,
        title: 'Recycle Bin'
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/trash/assets',
  authRequired,
  async (req, res, next) => {
    try {
      
      const deletedAssets = await Asset.find({ isDeleted: true }).exec();

      res.render('manage/trash', {
        activity: 'manage-page-trash',
        deletedAssets: deletedAssets,
        title: 'Recycle Bin'
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/trash/reports',
  authRequired,
  async (req, res, next) => {
    try {
      
      const deletedReports = await Report
        .find({ isDeleted: true })
        .sort({'timestamp': -1}).exec();

      res.render('manage/trash', {
        activity: 'manage-page-trash',
        deletedReports: deletedReports,
        title: 'Recycle Bin'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
