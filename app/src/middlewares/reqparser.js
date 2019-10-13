/**
 * Module that contains middlewares that doing any manipulations with express
 * request, changing req parameters values or adding new fields to req.
 * @module middlewares/reqparser
 */
const _ = require('lodash');
const {Post} = require('../models/post');
const Board = require('../models/board');


/**
 * Middleware that converts contents req.body.posts array from strings like
 * 'post-b-123' where first group is always 'post', second is board uri, third
 * number is post id on that board, forth is optional and represents index of
 * attachment in post, if attachment index is present, req.body.attachments
 * will be populated too
 * @example
 * // original request
 * req.body.posts = ['post-b-123']
 * // becomes
 * req.body.posts = [{ boardUri: 'b', postId: 123 }]
 * @example
 * // original request
 * req.body.posts = []
 * req.body.attachments = ['post-b-123-4']
 * // becomes
 * req.body.posts = [{ boardUri: 'b', postId: 123 }]
 * req.body.attachments = [{ boardUri: 'b', postId: 123, attachmentIndex: 4 }]
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
module.exports.parsePostIds = (req, res, next) => {
  try {
    const allStrings = _.concat(req.body.posts, req.body.attachments);
    const posts = [];
    const attachments = [];
    allStrings.forEach((postStr) => {
      if (!postStr) {
        return;
      }
      const [ post, boardUri, s_postId, s_attachmentIndex ] = postStr.split('-');
      if (post !== 'post') {
        return;
      }
      const postId = parseInt(s_postId);
      posts.push({ boardUri, postId });
      if (s_attachmentIndex !== undefined) {
        const attachmentIndex = parseInt(s_attachmentIndex);
        attachments.push({ boardUri, postId, attachmentIndex });
      }
    });

    req.body.posts = _.uniq(posts);
    req.body.attachments = _.uniq(attachments);

    next();
  } catch (error) {
    next(error);
  }
};


/**
 * Middleware that populates req.body.posts which contains { boardUri, postId }
 * with corresponding Post documents from MongoDB.
 * @async
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
module.exports.findPosts = async (req, res, next) => {
  try {
    if (req.body.posts && req.body.posts.length) {
      req.body.posts = await Post.findPosts(req.body.posts);
    }
    next();    
  } catch (error) {
    next(error);
  }
};


/**
 * Middleware that finds board and populates req.body.board based on either
 * req.params.boardUri or req.body.board
 * @async
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
module.exports.findBoard = async (req, res, next) => {
  try {
    const boardUri = req.params.boardUri || req.body.board;
    if (boardUri) {
      req.body.board = await Board.findBoard(boardUri);
    }
    next();
  } catch (error) {
    next(error);
  }
};
