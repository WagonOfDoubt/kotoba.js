/**
 * Module that contains middlewares that doing any manipulations with express
 * request, changing req parameters values or adding new fields to req.
 * @module middlewares/reqparser
 */
const Post = require('../models/post');


/**
 * Middleware that converts contents req.body.posts array from strings like
 * 'post-b-123' to objects { boardUri: 'b', postId: 123 } which can be used as
 * query to MongoDB.
 */
module.exports.parsePostIds = (req, res, next) => {
  if (req.body.posts && req.body.posts.length) {
    req.body.posts = req.body.posts.map((postStr) => {
      const [ _, boardUri, postId ] = postStr.split('-');
      return { boardUri, postId };
    });    
  }
  next();
};


/**
 * Middleware that populates req.body.posts which contains { boardUri, postId }
 * with corresponding Post documents from MongoDB.
 * @async
 */
module.exports.findPosts = async (req, res, next) => {
  if (req.body.posts && req.body.posts.length) {
    req.body.posts = await Post.findPosts(req.body.posts);
  }
  next();
};
