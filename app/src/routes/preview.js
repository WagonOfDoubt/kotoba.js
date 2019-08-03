const express = require('express');
const router = express.Router();
const { param } = require('express-validator/check');

const Post = require('../models/post');
const { authRequired } = require('../middlewares/permission');
const { validateRequest } = require('../middlewares/validation');
const { checkSchema } = require('express-validator/check');


router.post('/preview/news',
  [
    validateRequest,
    authRequired
  ],
  async (req, res, next) => {
    try {
      res.render('includes/newsentry', { n: req.body.data });
    }
    catch (err) {
      next(err);
    }
  }
);

router.post('/preview/markdown',
  [
    validateRequest,
    authRequired
  ],
  async (req, res, next) => {
    try {
      res.send(res.locals.filters.markdown(req.body.data));
    } catch (err) {
      next(err);
    }
  }
);

router.get('/preview/replies/:board/:thread',
  [
    param('board').isAlphanumeric(),
    param('thread').isNumeric(),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      const thread = await Post
        .findThread(req.params.board, req.params.thread)
        .select('children')
        .populate('children');
      if (!thread) {
        const err = new Error('Thread not found');
        err.status = 404;
        throw err;
      }
      const data = { replies: thread.children };
      res.render('includes/replieslist', data);
    } catch (err) {
      next(err);
    }
  }
);


router.get('/preview/post/:board/:post',
  [
    checkSchema({
      board: {
        in: 'params',
        matches: {
          options: [/[a-zA-Z0-9_]*$/],
          errorMessage: 'Board uri can contain only letters and numbers or underscore',
        },
      },
      post: {
        in: 'params',
        isNumeric: {
          options: {
            no_symbols: true,
          },
        },
        errorMessage: 'Invalid post Id',
      }
    }),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { board, post } = req.params;
      const query = { boardUri: board, postId: post };
      const isAdmin = req.user.authority === 'admin';
      const hasBoardRole = req.user.boardRoles.hasOwnProperty(board);
      if (!(isAdmin || hasBoardRole)) {
        query.isDeleted = false;
      }
      const p = await Post.findOne(query);
      if (p) {
        const data = { post: p, isPreview: true };
        res.render('includes/post', data);
      } else {
        return res.sendStatus(404);
      }
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
