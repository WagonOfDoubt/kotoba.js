const express = require('express');
const router = express.Router();
const { oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const _ = require('lodash');

// const boardController = require('../controllers/board');
const Post = require('../models/post');
const middlewares = require('../utils/middlewares');
const sanitizer = require('../middlewares/sanitizer');

const flags = ['isDeleted', 'isNSFW', 'isSpoiler'];

router.patch(
  '/api/attachment',
  [
    body('attachments').exists(),
    body('set')
      .exists()
      .customSanitizer(sanitizer.pick(flags)),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      // string -> ObjectId
      const attachmentIds = req.body.attachments.map((strId) => ObjectId(strId));
      // { attachments.$[elem].is(Deleted|NSFW|Spoiler): (true|false) }
      const setObj = _.mapKeys(req.body.set, (key) => 'attachments.$[elem].' + key);

      const selectQuery = { 'attachments._id': { $in: attachmentIds } };
      const updateQuery = { $set: setObj };
      const arrayFilters = [{ 'elem._id': { $in: attachmentIds } }];
      const queryOptions = { arrayFilters: arrayFilters, multi: true };

      const status = await Post.update(selectQuery, updateQuery, queryOptions).exec();
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
