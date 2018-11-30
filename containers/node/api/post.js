const express = require('express');
const ObjectId = require('mongoose').Types.ObjectId;
const router = express.Router();
const { body } = require('express-validator/check');
const _ = require('lodash');

const Post = require('../models/post');
const ModlogEntry = require('../models/modlog');
const middlewares = require('../utils/middlewares');
const reqparser = require('../middlewares/reqparser');
const { postEditPermission } = require('../middlewares/permission');
const sanitizer = require('../middlewares/sanitizer');
const { updatePosts } = require('../controllers/posting');

const flags = [
  // threads
  'isSticky', 'isClosed',
  // posts
  'isSage', 'isApproved', 'isDeleted',
  // attachmsnts
  'attachment.isDeleted', 'attachment.isNSFW', 'attachment.isSpoiler'
];

router.patch(
  '/api/post',
  [
    body('posts').exists(),
    body('set')
      .exists()
      .customSanitizer(sanitizer.pick(flags)),
    body('regenerate').toBoolean(),
    middlewares.validateRequest,
    reqparser.parsePostIds,
    reqparser.findPosts,
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
      const { posts, set, regenerate, attachments } = req.body;
      const attachmentIds = attachments ? attachments.map(ObjectId) : [];

      const attachmentPropertyPrefix = 'attachment.';
      const setPostProperties = _.pickBy(set,
        (value, key) => !key.startsWith(attachmentPropertyPrefix));
      let setAttachmentPropties = _.pickBy(set,
        (value, key) => key.startsWith(attachmentPropertyPrefix));
      setAttachmentPropties = _.mapKeys(setAttachmentPropties,
        (value, key) => key.substring(attachmentPropertyPrefix.length));

      const mongoResponse = await updatePosts(
        posts, setPostProperties,
        attachmentIds, setAttachmentPropties,
        regenerate);
      status.mongo = mongoResponse;

      const changes = [];
      posts.forEach((post) => {
        Object
          .entries(setPostProperties)
          .forEach(([key, value]) => {
            if (post[key] !== value) {
              changes.push({
                target: post._id,
                model: 'Post',
                property: key,
                oldValue: post[key],
                newValue: value,
              });
            }
          });
      });
      const ua = _.pick(req.useragent, [
        'os', 'platform',
        'browser', 'version',
        'isBot', 'isMobile', 'isDesktop',
        'source']);
      const modlogEntry = new ModlogEntry({
        ip: req.ip,
        useragent: ua,
        user: req.user,
        changes: changes,
      });
      await modlogEntry.save();

      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
