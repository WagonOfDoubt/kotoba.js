const express = require('express');
const ObjectId = require('mongoose').Types.ObjectId;
const router = express.Router();
const { body } = require('express-validator/check');
const _ = require('lodash');

const Post = require('../../models/post');
const ModlogEntry = require('../../models/modlog');
const middlewares = require('../../utils/middlewares');
const reqparser = require('../../middlewares/reqparser');
const { postEditPermission } = require('../../middlewares/permission');
const sanitizer = require('../../middlewares/sanitizer');
const { updatePosts } = require('../../controllers/posting');

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

      const changes = posts.reduce(
        (acc, post) => {
          return [
            ...acc,
            ...ModlogEntry.diff('Post', post._id, post.toObject(), setPostProperties)
          ];
        }, []);
      if (!changes.length) {
        throw new Error('Nothing to change');
      }
      await ModlogEntry.create({
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        changes: changes,
        regenerate: false,
      });

      const mongoResponse = await updatePosts(
        posts, setPostProperties,
        attachmentIds, setAttachmentPropties,
        regenerate);
      status.mongo = mongoResponse;
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
