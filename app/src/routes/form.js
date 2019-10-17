/**
 * Express router providing legacy form actions
 */

const express = require('express');
const _ = require('lodash');
const { checkSchema } = require('express-validator');
const multer = require('multer');
const upload = multer();
const { validateForm, filterMatched } = require('../middlewares/validation');
const { modifyPostHandler } = require('./handlers/post');
const { createPost, updatePosts } = require('../controllers/posting');
const boardparams = require('../json/boardparams');

const router = express.Router();


router.post('/form/post',
  upload.array('files'),
  checkSchema({
    board: {
      in: 'body',
      isLength: {
        options: { min: 1 },
        errorMessage: 'Board uri must not be empty',
      },
      matches: {
        options: [/^[a-z0-9_]*$/],
        errorMessage: 'Board uri can contain only letters and numbers or underscore',
      },
      custom: {
        options: (v) => !boardparams.uriBlacklist.includes(v),
        errorMessage: 'This board uri is not allowed',
      },
    },
    replythread: {
      in: 'body',
      isInt: {
        options: { min: 0 },
      },
      toInt: true,
      optional: true,
    },
    name: {
      in: 'body',
      trim: true,
    },
    em: {
      in: 'body',
      trim: true,
    },
    subject: {
      in: 'body',
      trim: true,
    },
    message: {
      in: 'body',
      trim: true,
    },
    postpassword: {
      in: 'body',
      trim: true,
    },
    spoiler: {
      in: 'body',
      toBoolean: true,
      optional: true,
    },
    sage: {
      in: 'body',
      toBoolean: true,
      optional: true,
    },
    postredir: {  // noko
      in: 'body',
      toBoolean: true,
      optional: true,
    },
    captcha: {
      in: 'body',
      trim: true,
    },
  }),
  validateForm,
  filterMatched,
  async (req, res, next) => {
    try {
      const postData = {
        'boardUri': req.body.board,
        'threadId': req.body.replythread,
        'name': req.body.name,
        // 'tripcode': req.body.name,
        'email': req.body.em,
        'subject': req.body.subject,
        'body': req.body.message,
        'password': req.body.postpassword,
        'isSage': req.body.sage,
        'attachments': req.files,
      };
      postData.attachments =
        _.map(
          postData.attachments,
          (fileDesc) => {
            fileDesc.isSpoiler = req.body.spoiler || false;
            return fileDesc;
          });
      const posterInfo = {
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        session: req.session,
      };
      const options = {
        captcha: req.body.captcha,
        regenerate: true,
      };
      const result = await createPost(postData, posterInfo, options);
      if (req.body.postredir) {
        res.redirect(302, result.location);
      } else {
        res.redirect(302, `/${ result.boardUri }`);
      }
    } catch (err) {
      res.render('errorpage', {
        title: 'Error',
        error: err,
      });
    }
  }
);


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
 * @todo return HTML page, not JSON
 * @todo implement reporting form
 */
router.post('/form/delpost',
  checkSchema({
    posts: {
      in: 'body',
      custom: {
        options: (value) => (value && value.length),
      },
      errorMessage: 'Posts array is empty',
    },
    'posts.*': {
      in: 'body',
      matches: {
        options: [/^post-[a-z0-9_]+-\d+$/]
      },
      errorMessage: 'Posts must be referenced as "post-{board}-{number}", i.e. "post-b-123"',
      trim: true,
    },
    fileonly: {
      in: 'body',
      toBoolean: true,
    },
    postpassword: {
      in: 'body',
      trim: true,
    }
  }),
  validateForm,
  filterMatched,
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

      const items = parsedPosts.map(p => ({
        target: p,
        update: updateObject
      }));
      req.body.items = items;
      req.body.regenerate = true;
      next();
    } catch (err) {
      res.render('errorpage', {
        title: 'Error',
        error: err,
      });
    }
  },
  modifyPostHandler
);

module.exports = router;
