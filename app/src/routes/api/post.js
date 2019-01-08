const express = require('express');
const ObjectId = require('mongoose').Types.ObjectId;
const router = express.Router();
const { body, oneOf } = require('express-validator/check');
const _ = require('lodash');
const multer = require('multer');
const upload = multer();

const Post = require('../../models/post');
const ModlogEntry = require('../../models/modlog');

const { updatePosts } = require('../../controllers/posting');

const reqparser = require('../../middlewares/reqparser');
const { validateRequest } = require('../../middlewares/validation');
const { postEditPermission } = require('../../middlewares/permission');
const sanitizer = require('../../middlewares/sanitizer');

const { createPostHandler } = require('../handlers/post');


/**
 * Filter and merge items in post.body.items
 * @async
 * @example
 * // original
 * req.body.items = [
 *   { target: { boardUri: 'b', postId: 123 }, update: { 'attachments.0.isDeleted': true } },
 *   { target: { boardUri: 'b', postId: 123 }, update: { 'attachments.1.isDeleted': true } },
 *   { target: { boardUri: 'b', postId: 456 }, update: { 'isSticky': true, invalidField: 123 } },
 *   { target: { boardUri: 'a', postId: 789, junk: 'some_junk' }, update: { 'isSage': true } },
 * ];
 * // becomes
 * req.body.items = [
 *   { target: { boardUri: 'b', postId: 123 }, update: { 'attachments.0.isDeleted': true, 'attachments.1.isDeleted': true } },
 *   { target: { boardUri: 'b', postId: 456 }, update: { 'isSticky': true } },
 *   { target: { boardUri: 'a', postId: 789 }, update: { 'isSage': true } },
 * ];
 */
const filterItemsAndFindPosts = async (req, res, next)=> {
  try {
    const items = req.body.items;
    // filter input and find unique posts
    const targets = items.map(item =>
      _.pick(item.target, ['boardUri', 'postId']));
    const postQuery = _.uniqWith(targets, _.isEqual);
    // get posts from DB
    const posts = await Post.findPosts(postQuery);

    const postsIsEqual = (p1, p2) =>
      p1.postId === p2.postId && p1.boardUri === p2.boardUri;
    // match posts with corresponding update dictionaries
    req.body.items = posts.map(p => {
      const updates = items
        .filter(item => postsIsEqual(item.target, p))
        .map(_.property('update'));
      const update  = _.assign(...updates);
      return { target: p, update: update }
    });
    next();
  } catch (err) {
    next(err);
  }
};


router.post('/api/post', createPostHandler);


router.patch(
  '/api/post',
  [
    body('items').exists().isArray(),
    body('regenerate').toBoolean(),
    validateRequest,
    filterItemsAndFindPosts,
    // filters req.body.items so only posts that can be changed by current user
    // are present
    postEditPermission,
  ],
  async (req, res, next) => {
    try {
      const status = {
        success: res.locals.permissionGranted,
        fail: res.locals.permissionDenied,
      };
      const { items, regenerate } = req.body;

      const changes = items.reduce((acc, item) => {
        const { target, update } = item;
        const diffs = ModlogEntry.diff('Post', target._id, target.toObject(), update);
        return [...acc, ...diffs];
      }, []);

      if (!changes.length) {
        throw new Error('Nothing to change');
      }

      await ModlogEntry.create({
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        changes: changes,
        regenerate: regenerate,
      });

      const mongoResponse = await updatePosts(items, regenerate);
      status.mongo = mongoResponse;
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
