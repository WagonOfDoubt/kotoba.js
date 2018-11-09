const express = require('express');
const router = express.Router();
const { body } = require('express-validator/check');
const _ = require('lodash');

const Post = require('../models/post');
const middlewares = require('../utils/middlewares');
const { postEditPermission } = require('../middlewares/permission');
const { updatePosts } = require('../controllers/posting');

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

      const mongoResponse = updatePosts(posts, set, regenerate);
      status.mongo = mongoResponse;
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
