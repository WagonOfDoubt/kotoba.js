const express = require('express');
const router = express.Router();
const { oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// const boardController = require('../controllers/board');
const Post = require('../models/post');
const middlewares = require('../utils/middlewares');


router.patch(
  '/api/attachment',
  [
    body('attachments').exists(),
    body('set').exists(),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      const attachmentIds = req.body.attachments.map((strId) => ObjectId(strId));
      const setObj = ['isDeleted', 'isNSFW', 'isSpoiler']
        .reduce((acc, curr) => {
          if (req.body.set.hasOwnProperty(curr)) {
            acc['attachments.$[elem].' + curr] = req.body.set[curr];
          }
          return acc;
        }, {});
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
