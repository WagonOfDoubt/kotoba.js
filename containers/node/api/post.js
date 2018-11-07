const express = require('express');
const router = express.Router();
const { oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const _ = require('lodash');

const Post = require('../models/post');
const Board = require('../models/board');
const middlewares = require('../utils/middlewares');
const { postEditPermission } = require('../middlewares/permission');
const { generateThreads, generateBoards } = require('../controllers/generate');

const filterSetObj = (req, res, next) => {
  // boolean fields of Post mongo document that can be changed by this api
  const flags = ['isSticky', 'isClosed', 'isSage', 'isApproved', 'isDeleted'];
  req.body.set = _.pick(req.body.set, flags);
  next();
};

router.patch(
  '/api/post',
  [
    body('posts').exists(),
    body('set').exists(),
    filterSetObj,
    body('regenerate').toBoolean(),
    middlewares.validateRequest,
    middlewares.parsePostIds,
    middlewares.findPosts,
    // filters req.body.posts so only posts that can be changed by current user
    // are present
    postEditPermission,
  ],
  async (req, res, next) => {
    try {
      const status = {
        success: res.locals.permissionGranted,
        fail: res.locals.permissionDenied,
      };
      const { posts, set, regenerate } = req.body;

      if (!posts.length) {
        res.json(status);
        return;
      }

      const selectQuery = { $or: posts.map(_.partialRight(_.pick, ['_id'])) };
      const updateQuery = { $set: set };
      const mongoResponse = await Post.updateMany(selectQuery, updateQuery);
      status.mongo = mongoResponse;
      if (regenerate) {
        const replies = posts.filter(r => !r.isOp);
        const threads = posts.filter(t => t.isOp);

        const threadsAffected = _.unionBy(
          replies.map(_.property('parent')),
          threads.map(_.property('_id')),
          String);

        const boardsAffected = _.uniqBy(
          posts.map(_.property('board')),
          String);

        await Promise
          .all([
            Post.findThreadsByIds(threadsAffected).populate('children'),
            Board.findBoardsByIds(boardsAffected)
          ])
          .then(([threadDocuments, boardDocuments]) => {
            return generateThreads(threadDocuments)
              .then(generateBoards(boardDocuments));
          });
        console.log('threads:', threadsAffected, 'boards:', boardsAffected);
      }
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
