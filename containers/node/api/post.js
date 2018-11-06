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
const { generateThreads, generateBoards } = require('../controllers/generate');


router.patch(
  '/api/post',
  [
    body('posts').exists(),
    middlewares.parsePostIds,
    middlewares.findPosts,
    body('set').exists(),
    body('regenerate').toBoolean(),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      const { posts, set, regenerate } = req.body;
      // boolean fields of Post mongo document that can be changed by this api
      const flags = ['isSticky', 'isClosed', 'isApproved', 'isDeleted'];
      const setObj = _.pick(set, flags);
      // TODO: check permission to edit posts
      const allowedPosts = posts;
      const selectQuery = { $or: allowedPosts.map(_.partialRight(_.pick, ['_id'])) };
      const updateQuery = { $set: setObj };
      const status = await Post.updateMany(selectQuery, updateQuery);
      if (regenerate) {
        const replies = allowedPosts.filter(r => !r.isOp);
        const threads = allowedPosts.filter(t => t.isOp);

        const threadsAffected = _.unionBy(
          replies.map(_.property('parent')),
          threads.map(_.property('_id')),
          String);

        const boardsAffected = _.uniqBy(
          allowedPosts.map(_.property('board')),
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
