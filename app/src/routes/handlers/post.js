const { body } = require('express-validator');
const multer = require('multer');
const upload = multer();
const _ = require('lodash');

const { createThread,
  createReply,
  deletePosts } = require('../../controllers/posting.js');

const { updatePosts } = require('../../controllers/posting');

const { validateRequest } = require('../../middlewares/validation');
const { postEditPermission } = require('../../middlewares/permission');
const { filterPostTargetItems,
  populatePostUpdateItems,
  filterOutOfBoundItems,
  findUserRoles } = require('../../middlewares/post');


module.exports.createPostHandler = [
  upload.array('files'),
  body('board').isAlphanumeric(),
  body('replythread').isInt({ min: 0 }),
  body('replythread').toInt(),
  body('email').isEmpty(),
  body('name').isLength({ max: 75 }),
  // body('em').normalizeEmail(),
  body('captcha').trim(),
  body('subject').isLength({ max: 75 }),
  body('message').trim(),
  body('postpassword').trim(),
  body('sage').toBoolean(),
  body('noko').toBoolean(),
  validateRequest,
  async (req, res, next) => {
    // TODO check ban
    const ip = req.ip;
    // TODO check captcha
    const capthca = req.body.capthca;
    const files = req.files;
    const boardUri = req.body.board;

    const postData = {
      ip: ip,
      useragent: req.useragent,
      boardUri: boardUri,
      name: req.body.name,
      email: req.body.sage ? 'sage' : req.body.em,
      subject: req.body.subject,
      body: req.body.message,
      password: req.body.postpassword,
      isSage: req.body.sage || req.body.em == 'sage'
    };

    const noko = req.body.postredir || req.body.em == 'noko';

    const replythread = req.body.replythread;
    const isNewThread = replythread == 0;
    let threadId = replythread;
    try {
      if (isNewThread) {
        threadId = await createThread(boardUri, postData, files);
      } else {
        await createReply(boardUri, replythread, postData, files);
      }
    } catch (error) {
      next(error);
      return;
    }

    if (req.is('json')) {
      res.status(201).json({ ok: 1 });
    } else {
      if (noko) {
        res.redirect(302, `/${ boardUri }/res/${ threadId }.html`);
      } else {
        res.redirect(302, `/${ boardUri }`);
      }
    }
  }
];


module.exports.modifyPostHandler = [
  body('items').exists().isArray(),
  body('regenerate').toBoolean(),
  body('postpassword').trim(),
  validateRequest,
  // filters req.body.items so only posts that can be changed by current user
  // are present
  filterPostTargetItems,
  populatePostUpdateItems,
  filterOutOfBoundItems,
  findUserRoles,
  postEditPermission,
  async (req, res, next) => {
    try {
      const { items, regenerate } = req.body;
      if (_.isEmpty(items)) {
        if (_.isEmpty(res.locals.fail)) {
          return res.status(418);
        }
        const { status, error } = _.pick(res.locals.fail[0], 'status');
        return res
          .status(status)
          .json({
            fail: res.locals.fail
          });
      }

      const modlogData = {
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
      };

      const { success, fail } = await updatePosts(items, modlogData, regenerate);
      return res
        .status(200)
        .json({
          fail: [...res.locals.fail, ...fail],
          success: success,
        });
    } catch (err) {
      return next(err);
    }
  }
];


/* TODO: currently broken
module.exports.deletePostHandler = [
  body('posts').exists(),
  body('postpassword').exists(),
  validateRequest,
  reqparser.parsePostIds,
  reqparser.findPosts,
  // filters req.body.posts so only posts that can be changed by current user
  // are present
  postEditPermission,
  async (req, res, next) => {
    try {
      const status = {
        success: res.locals.permissionGranted,
        fail: res.locals.permissionDenied,
      };
      const fileonly = req.body.fileonly === 'on';
      const { posts } = req.body;

      if (!fileonly) {
        const mongoResponse = updatePosts(posts, { isDeleted: true }, true);
        status.mongo = mongoResponse;
      } else {
        // TODO attachment deletion
      }

      req.flash('deletion', status);
      res.redirect('back');
    } catch (error) {
      next(error);
    }
  }
];
*/