const express = require('express');
const ObjectId = require('mongoose').Types.ObjectId;
const router = express.Router();
const { body, oneOf } = require('express-validator/check');
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
    oneOf([
      body('posts').exists(),
      body('attachments').exists(),
    ]),
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

      const attachmentPropertyPrefix = 'attachment.';
      const setPostProperties = _.pickBy(set,
        (value, key) => !key.startsWith(attachmentPropertyPrefix));
      let setAttachmentPropties = _.pickBy(set,
        (value, key) => key.startsWith(attachmentPropertyPrefix));
      setAttachmentPropties = _.mapKeys(setAttachmentPropties,
        (value, key) => key.substring(attachmentPropertyPrefix.length));
      
      const attachmentIds = [];
      const changes = posts.reduce(
        (acc, post) => {
          let postChanges = _.clone(setPostProperties);
          if (post.attachments && post.attachments.length && setAttachmentPropties) {
            const attachmentIndexes = attachments
              .filter(att =>
                att.boardUri === post.boardUri &&
                att.postId === post.postId &&
                att.attachmentIndex < post.attachments.length)
              .map(att => att.attachmentIndex);

            if (attachmentIndexes.length) {
              postChanges.attachments = [];
              attachmentIndexes.forEach(attachmentIndex => {
                postChanges.attachments[attachmentIndex] = setAttachmentPropties;
                attachmentIds.push(post.attachments[attachmentIndex]._id);
              });
            }
          }
          return [
            ...acc,
            ...ModlogEntry.diff('Post', post._id, post.toObject(), postChanges)
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
        regenerate: regenerate,
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
