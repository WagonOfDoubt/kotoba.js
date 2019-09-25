const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');

const Post = require('../models/post');
const { authRequired } = require('../middlewares/permission');
const { validateRequest } = require('../middlewares/validation');


router.post('/preview/news',
  authRequired,
  checkSchema({
    
  }),
  validateRequest,
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
  authRequired,
  checkSchema({
    data: {
      in: 'body',
      isLength: {
        options: { min: 1 },
        errorMessage: 'Markdown code is empty',
      }
    }
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      res.send(res.locals.filters.markdown(req.body.data));
    } catch (err) {
      next(err);
    }
  }
);


router.get('/preview/replies/:board/:thread',
  checkSchema({
    board: {
      in: 'params',
      matches: {
        options: [/^[a-zA-Z0-9_]*$/],
        errorMessage: 'Board uri can contain only letters and numbers or underscore',
      },
    },
    thread: {
      in: 'params',
      isNumeric: {
        options: {
          no_symbols: true,
        },
      },
      errorMessage: 'Invalid thread Id',
    },
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { board, thread } = req.params;
      const query = { boardUri: board, postId: thread, isOp: true };
      const isAdmin = req.user && req.user.authority === 'admin';
      const hasBoardRole = req.user && req.user.boardRoles && req.user.boardRoles.hasOwnProperty(board);
      if (!(isAdmin || hasBoardRole)) {
        query.isDeleted = false;
      }
      const t = await Post
        .findOne(query)
        .select('children')
        .populate('children');
      if (!t) {
        return res.sendStatus(404);
      }
      const data = { replies: t.children };
      res.render('includes/replieslist', data);
    } catch (err) {
      next(err);
    }
  }
);


router.get('/preview/post/:board/:post',
  checkSchema({
    board: {
      in: 'params',
      matches: {
        options: [/^[a-zA-Z0-9_]*$/],
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
  async (req, res, next) => {
    try {
      const { board, post } = req.params;
      const query = { boardUri: board, postId: post };
      const isAdmin = req.user.authority === 'admin';
      const hasBoardRole = req.user.boardRoles && req.user.boardRoles.hasOwnProperty(board);
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
