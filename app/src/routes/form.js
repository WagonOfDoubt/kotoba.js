/**
 * Express router providing legacy form actions
 * @module routes/form
 * @requires express
 * @requires handlers/post
 */

/**
 * express module
 * @const
 */
const express = require('express');

const { createPostHandler, modifyPostHandler } = require('./handlers/post');

/**
 * Express router for paths:
 * /form/post
 * /form/delpost
 * @const
 */
const router = express.Router();

/**
 * Route for posting form
 * @name {post}
 */
router.post('/form/post', createPostHandler);

/**
 * Route for post deletion form. Action for post or attachment deletion
 *    initiated by delform at bottom of the page. This is only used to support
 *    post deletion feature in browsers without JS enabled. Not part of JSON
 *    api. Use JSON api {patch} /api/post that has more features instead. Form
 *    data:
 *    - {Array} posts: Array of post ids in form of strings like
 *    'post-b-123'
 *    - {Boolean} fileonly: If true, delete only attachments of
 *    given posts
 * @name {post} /form/delpost
 * @function
 * @memberOf routes/form
 * @inner
 */
router.post('/form/delpost', [

  async (req, res, next) => {
    try {
      const posts = req.body.posts;
      const parsedPosts = posts
        .map((postStr) => {
          const values = postStr.split('-');
          if (values.length !== 3) {
            return null;
          }
          return {
            boardUri: values[1],
            postId: parseInt(values[2])
          };
        })
        .filter(p => p);

      const fileonly = req.body.fileonly;
      const updateObject = {};
      if (fileonly) {
        for (let i = 0; i < 10; i++) {
          updateObject[`attachments.${i}.isDeleted`] = true;
        }
      } else {
        updateObject.isDeleted = true;
      }

      const items = parsedPosts.map(p => {
        return {
          target: p,
          update: updateObject
        };
      });
      req.body.items = items;
      req.body.regenerate = true;
      next();
    } catch (err) {
      next(err);
    }
  },
  modifyPostHandler
]);

module.exports = router;
