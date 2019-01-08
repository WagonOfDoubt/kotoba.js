const express = require('express');
const router = express.Router();
const { param } = require('express-validator/check');

const Post = require('../models/post');
const { authRequired } = require('../middlewares/permission');
const { validateRequest } = require('../middlewares/validation');


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

module.exports = router;
