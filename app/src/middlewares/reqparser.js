/**
 * Module that contains middlewares that doing any manipulations with express
 * request, changing req parameters values or adding new fields to req.
 * @module middlewares/reqparser
 */
const _ = require('lodash');
const {Post} = require('../models/post');
const Board = require('../models/board');
const XRegExp = require('xregexp');


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


const reQueryFilter = new XRegExp(`
(?<=\\s|^)  # start
(?<pair>
  (?<field>\\w+?)
  \\:  # field:value separator
  (?<value>
    (?<oparg>
      (?<operator>\\$\\S+)  # $operator
      \\(  # argument starts with (
      (?<argument>
        (?:\\"(?<stringArg>.+?)\\") | # String  "string"
        (?:\\[(?<arrayArg>.+?)\\])  | # Array   [array]
        (?<integerArg>\\d+)        | # Integer 265
        (?<numberArg>[\\d\\.]+)       # Float   3.14
      )
      \\)  # argument ends with )
    ) |
    # simple values
    (?:\\"(?<stringVal>.+?)\\") | # String  "string"
    (?<integerVal>\\d+)        | # Integer 265
    (?<numberVal>[\\d\\.]+)       # Float   3.14
  )
)
(?:$|\\s)  # end`, 'gx');


const getQueryFilterValidator = (value) => {
  return XRegExp.test(value, reQueryFilter);
};


const getQueryFilterParser = (value, {req, location, path}) => {
  if (!value) {
    return {};
  }
  const filter = {};
  XRegExp.forEach(value, reQueryFilter, (matches) => {
    const { field, operator } = matches;
    let value;
    if (operator) {
      const { stringArg, arrayArg, numberArg, integerArg } = matches;
      let argument = stringArg || Number.parseFloat(numberArg) || Number.parseInt(integerArg);
      if (arrayArg) {
        argument = arrayArg.split('|').map(arg => {
          if (arg.startsWith('"') && arg.endsWith('"')) {
            return arg.substring(1, arg.length - 1);
          }
          if (arg.match(/^\d+$/)) {
            return Number.parseInt(arg);
          }
          if (arg.match(/^[\.\d]+$/)) {
            return Number.parseFloat(arg);
          }
          return null;
        });
      }
      value = {};
      value[operator] = argument;
    } else {
      const { stringVal, numberVal, integerVal } = matches;
      value = stringVal || Number.parseFloat(numberVal) || Number.parseInt(integerVal);
    }
    filter[field] = value;
  });
  return filter;
};


const getQuerySelectParser = (value, {req, location, path}) => {
  return _.split(value, ' ') || [];
};


const getQuerySortParser = (value, {req, location, path}) => {
  const result = {};
  const keys = value.split(' ');
  for (let key of keys) {
    let value = 1;
    if (!key || !key.length || key === '-') {
      continue;
    }
    if (key.startsWith('-')) {
      value = -1;
      key = key.substring(1);
    }
    result[key] = value;
  }
  return result;
};

module.exports.restGetQuerySchema = {
  search: {
    in: 'query',
    optional: true,
  },
  filter: {
    in: 'query',
    optional: true,
    customValidator: {
      options: getQueryFilterValidator,
    },
    customSanitizer: {
      options: getQueryFilterParser,
    },
  },
  select: {
    in: 'query',
    optional: true,
    customSanitizer: {
      options: getQuerySelectParser,
    },
  },
  sort: {
    in: 'query',
    optional: true,
    customSanitizer: {
      options: getQuerySortParser,
    },
  },
  skip: {
    in: 'query',
    isInt: {
      options: { min: 0 },
      errorMessage: 'skip must be a positive integer'
    },
    toInt: true,
    optional: true,
  },
  limit: {
    in: 'query',
    isInt: {
      options: { min: 1, max: 1000 },
      errorMessage: 'limit must be an integer in range [1, 1000]'
    },
    toInt: true,
    optional: true,
  },
};
