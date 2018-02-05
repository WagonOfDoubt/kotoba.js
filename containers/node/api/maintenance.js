const express = require('express');
const router = express.Router();
const { oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');

const { regenerateAll } = require('../controllers/generate');
const Post = require('../models/post');
const Parser = require('../controllers/parser');
const middlewares = require('../utils/middlewares');


router.post('/api/regenerate',
  middlewares.adminOnly,
  async (req, res, next) => {
    try {
      const start = new Date();

      await regenerateAll();

      const end = new Date();
      const seconds = (end.getTime() - start.getTime()) / 1000;
      res.status(200).json({ took: seconds });
    } catch (error) {
      next(error);
    }
  }
);


router.post('/api/parseposts',
  middlewares.adminOnly,
  async (req, res, next) => {
    try {
      const start = new Date();
      
      const posts = await Post.find().select('body boardUri').exec();
      const promises = posts.map(
        (post) => Parser.parsePost(post)
          .then(parsedPost => post.save()));
      await Promise.all(promises);

      const end = new Date();
      const seconds = (end.getTime() - start.getTime()) / 1000;
      res.status(200).json({ took: seconds });
    } catch (error) {
      next(error);
    }
  }
);


module.exports = router;
