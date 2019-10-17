/**
 * This module handles post manipulation, creation of new post and threads, as
 *    well as editing and deletion
 * @module controllers/posting
 */

const ObjectId = require('mongoose').Types.ObjectId;
const { generateThread, generateThreads, generateBoardPagesAndCatalog } = require('./generate');
const { uploadFiles } = require('./upload');
const Board = require('../models/board');
const { Post, Thread, Reply } = require('../models/post');
const ModlogEntry = require('../models/modlog');
const Parser = require('./parser');
const fs = require('fs-extra');
const config = require('../json/config');
const path = require('path');
const _ = require('lodash');
const Captcha = require('../models/captcha');
const {
  PostingError,
  DocumentNotFoundError,
  CaptchaEntryNotFoundError,
  IncorrectCaptchaError,
  FileTooLargeError } = require('../errors');


/**
 * @typedef  {Object} PostingResult
 * @property {String} location Url that leads to post
 * @property {String} boardUri Post board
 * @property {Number} threadId Post parent thread number
 * @property {Number} postId Post number
 */


/**
 * Create new thread or reply to thread
 * @async
 * @param {Object}  postData Post data
 * @param {String}  postData.boardUri Uri of board this post is posted on
 * @param {Number}  [postData.threadId=0] Thread to reply to. If empty or 0,
 *    new thread will be created.
 * @param {Date}    [postData.createdAt=Date.now()] Date of post creation
 * @param {String}  [postData.name=""] Poster name instead.
 * @param {String}  [postData.tripcode=""] Poster tripcode
 * @param {String}  [postData.email=""] Poster email or other link
 * @param {String}  [postData.subject=""] Post subject
 * @param {String}  [postData.body=""] Post message
 * @param {String}  [postData.password=""] Password for post deletion
 * @param {Boolean} [postData.isSage=false] Don't bump thread
 * @param {Array<Object>} [postData.attachments] Array of attachments info
 *    with files from {@link
 *    https://github.com/expressjs/multer#readme|multer}
 * @param {Boolean} [postData.attachments.isNSFW=false] Mark attachment as
 *    NSFW
 * @param {Boolean} [postData.attachments.isSpoiler=false] Mark attachment as
 *    spoiler
 * @param {Object}  posterInfo Poster info
 * @param {String}  posterInfo.ip Poster ip
 * @param {Object}  posterInfo.useragent Poster useragent (parsed by {@link
 *    https://www.npmjs.com/package/express-useragent|express-useragent}
 *    middleware)
 * @param {Object}  [posterInfo.user] Logged in user object
 * @param {Object}  posterInfo.session Session info
 * @param {Object}  options  Posting options
 * @param {String}  [options.captcha] Answer to captcha challenge
 * @param {Boolean} [options.regenerate=true] Whether or not to generate
 *    static HTML files
 * @return {Object} Created post data
 * @see {@link https://github.com/expressjs/multer#readme}
 * @throws {DocumentNotFoundError} If board not found
 * @throws {PostingError} If postData has missing or invalid values
 * @throws {CaptchaEntryNotFoundError} If captcha expired
 * @throws {IncorrectCaptchaError} If captcha is incorrect
 * @throws {FileFormatNotSupportedError} If attachment file type is not
 *    supported
 * @throws {ThumbnailGenerationError} If something went wrong during thumbnail
 *    creation
 * @throws {FileTooLargeError} If attachment file size exceeds
 *    board.maxFileSize
 * @returns {PostingResult} Created post data
 */
module.exports.createPost = async (postData, posterInfo, options) => {
  if (!postData.threadId) {
    return await module.exports.createThread(postData, posterInfo, options);
  } else {
    return await module.exports.createReply(postData, posterInfo, options);
  }
};


const populatePostDataDefaults = (postData, posterInfo, board) => {
  postData.ip = posterInfo.ip;
  postData.useragent = posterInfo.useragent;
  if (board.isForcedAnon || !postData.name) {
    postData.name = board.defaultPosterName;
  }
  if (board.isForcedAnon) {
    postData.email = '';
  }
  if (postData.createdAt) {
    if (!(posterInfo.user && posterInfo.user.authority === 'admin')) {
      delete postData.createdAt;
    }
  }
  return postData;
};


/**
 * Check post message
 * @inner
 * @param  {Object} postData Post data
 * @param  {Board}  board    Board document
 * @throws {PostingError} If post has no message and no attachments
 * @throws {PostingError} If message length is more than allowed in board
 *    preferences
 */
const checkComment = (postData, board) => {
  if (!postData.body && !postData.attachments.length) {
    throw new PostingError('No comment entered', 'message', '', 'body');
  }
  if (postData.body && postData.body.length > board.maxMessageLength) {
    throw new PostingError(`Message is too long (>${board.maxMessageLength})`, 'body', postData.body.length, 'body');
  }
};


/**
 * Check post attachments
 * @inner
 * @param  {Object} postData Post data
 * @param  {Board}  board    Board document
 * @throws {PostingError} If post has more attachments than allowed by board
 * @throws {FileTooLargeError} If size of at least one of file exceeds maximum
 *    size allowed by board
 */
const checkAttachments = (postData, board) => {
  const attachments = postData.attachments;
  if (attachments.length > board.maxFilesPerPost) {
    throw new PostingError('Too many files', 'attachments', attachments.length, 'body');
  }
  if (attachments.length) {
    const biggestFile = _.maxBy(attachments, 'size');
    if (biggestFile > board.maxFileSize) {
      throw new FileTooLargeError('attachments', biggestFile, 'body');
    }
  }
};


/**
 * Check captcha
 * @inner
 * @async
 * @param  {String} action     "reply" or "thread"
 * @param  {Board}  board      Board document
 * @param  {String} captcha    Captcha answer
 * @param  {Object} posterInfo Poster info
 * @throws {CaptchaEntryNotFoundError} If captcha expired
 * @throws {IncorrectCaptchaError} If captcha is incorrect
 */
const checkCatptcha = async (action, board, captcha, posterInfo) => {
  if (board.captcha.enabled) {
    const expireTime = action === 'thread' ?
      board.captcha.threadExpireTime :
      board.captcha.replyExpireTime;
    const captchaAnswer = captcha;
    const captchaEntry = await Captcha.validate(captchaAnswer, posterInfo.session.id,
      action, board.uri, expireTime);
    if (captchaEntry === null) {
      throw new CaptchaEntryNotFoundError('captcha', captchaAnswer, 'body');
    }
    if (!captchaEntry.isSolved) {
      throw new IncorrectCaptchaError('captcha', captchaAnswer, 'body');
    }
  }
};


/**
 * Create new thread by adding it to DB, updating all related records in DB,
 *    uploading attachments and generating all related HTML files
 * @async
 * @param {Object}  postData Post data
 * @param {String}  postData.boardUri Uri of board this post is posted on
 * @param {Date}    [postData.createdAt=Date.now()] Date of post creation
 * @param {String}  [postData.name=""] Poster name instead.
 * @param {String}  [postData.tripcode=""] Poster tripcode
 * @param {String}  [postData.email=""] Poster email or other link
 * @param {String}  [postData.subject=""] Post subject
 * @param {String}  [postData.body=""] Post message
 * @param {String}  [postData.password=""] Password for post deletion
 * @param {Array<Object>} [postData.attachments] Array of attachments info
 *    with files from {@link
 *    https://github.com/expressjs/multer#readme|multer}
 * @param {Boolean} [postData.attachments.isNSFW=false] Mark attachment as
 *    NSFW
 * @param {Boolean} [postData.attachments.isSpoiler=false] Mark attachment as
 *    spoiler
 * @param {Object}  posterInfo Poster info
 * @param {String}  posterInfo.ip Poster ip
 * @param {Object}  posterInfo.useragent Poster useragent (parsed by {@link
 *    https://www.npmjs.com/package/express-useragent|express-useragent}
 *    middleware)
 * @param {Object}  [posterInfo.user] Logged in user object
 * @param {Object}  posterInfo.session Session info
 * @param {Object}  options  Posting options
 * @param {String}  [options.captcha] Answer to captcha challenge
 * @param {Boolean} [options.regenerate=true] Whether or not to generate
 *    static HTML files
 * @return {Object} Created post data
 * @see {@link https://github.com/expressjs/multer#readme}
 * @throws {DocumentNotFoundError} If board not found
 * @throws {PostingError} If postData has missing or invalid values
 * @throws {CaptchaEntryNotFoundError} If captcha expired
 * @throws {IncorrectCaptchaError} If captcha is incorrect
 * @throws {FileFormatNotSupportedError} If attachment file type is not
 *    supported
 * @throws {ThumbnailGenerationError} If something went wrong during thumbnail
 *    creation
 * @throws {FileTooLargeError} If attachment file size exceeds
 *    board.maxFileSize
 * @returns {PostingResult} Created thread data
 */
module.exports.createThread = async (postData, posterInfo, options) => {
  _.defaults(options, {
    regenerate: true,
  });
  const boardUri = postData.boardUri;
  const board = await Board.findBoard(boardUri);
  if (!board) {
    throw new DocumentNotFoundError('No such board: ' + boardUri, 'board', boardUri, 'body');
  }
  const attachments = postData.attachments;
  checkAttachments(postData, board);
  checkComment(postData, board);
  if (board.newThreadsRequired.message && !postData.body) {
    throw new PostingError('New threads must contain message', 'body', '', 'body');
  }
  if (board.newThreadsRequired.subject && !postData.subject) {
    throw new PostingError('New threads must contain subject', 'subject', '', 'body');
  }
  if (board.newThreadsRequired.files && !attachments.length) {
    throw new PostingError('New threads must include image', 'attachments', 0, 'body');
  }
  await checkCatptcha('thread', board, options.captcha, posterInfo);
  // @todo Check ban
  // @todo Check posting rates and permanent sage

  if (attachments.length) {
    const uploaded = await uploadFiles(boardUri, attachments, board.keepOriginalFileName);
    postData.attachments = _.map(
      _.zip(postData.attachments, uploaded),
      ([postAttachment, uploadedAttachment]) => {
        return {
          ...uploadedAttachment,
          isSpoiler: postAttachment.isSpoiler,
          isNSFW: postAttachment.isNSFW,          
        };
      }
    );
  }
  postData = populatePostDataDefaults(postData, posterInfo, board);
  postData.postId = board.postcount + 1;

  const thread = new Thread(postData);
  await Parser.parsePost(thread);
  board.postcount = board.postcount + 1;
  board.uniquePosts = await Post.getNumberOfUniqueUserPosts(board.uri);
  await Promise.all([
    thread.save(),
    board.save(),
  ]);
  // populate virtual field board to avoid another query to DB
  thread.board = board;
  if (options.regenerate) {
    await generateThread(thread);
    await generateBoardPagesAndCatalog(board);    
  }
  const location = `/${ thread.boardUri }/res/${ thread.postId }.html`;
  return Object.freeze({
    postId   : thread.postId,
    boardUri : thread.boardUri,
    threadId : thread.postId,
    location : location,
  });
};


/**
 * Create reply in thread by adding it to DB, updating all related records in
 *    DB, uploading attachments and generating all related HTML files
 * @async
 * @param {Object}  postData Post data
 * @param {String}  postData.boardUri Uri of board this post is posted on
 * @param {Number}  postData.threadId Thread to reply to
 * @param {Date}    [postData.createdAt=Date.now()] Date of post creation
 * @param {String}  [postData.name=""] Poster name instead.
 * @param {String}  [postData.tripcode=""] Poster tripcode
 * @param {String}  [postData.email=""] Poster email or other link
 * @param {String}  [postData.subject=""] Post subject
 * @param {String}  [postData.body=""] Post message
 * @param {String}  [postData.password=""] Password for post deletion
 * @param {Boolean} [postData.isSage=false] Don't bump thread
 * @param {Array<Object>} [postData.attachments] Array of attachments info
 *    with files from {@link
 *    https://github.com/expressjs/multer#readme|multer}
 * @param {Boolean} [postData.attachments.isNSFW=false] Mark attachment as
 *    NSFW
 * @param {Boolean} [postData.attachments.isSpoiler=false] Mark attachment as
 *    spoiler
 * @param {Object}  posterInfo Poster info
 * @param {String}  posterInfo.ip Poster ip
 * @param {Object}  posterInfo.useragent Poster useragent (parsed by {@link
 *    https://www.npmjs.com/package/express-useragent|express-useragent}
 *    middleware)
 * @param {Object}  [posterInfo.user] Logged in user object
 * @param {Object}  posterInfo.session Session info
 * @param {Object}  options  Posting options
 * @param {String}  [options.captcha] Answer to captcha challenge
 * @param {Boolean} [options.regenerate=true] Whether or not to generate
 *    static HTML files
 * @return {Object} Created post data
 * @see {@link https://github.com/expressjs/multer#readme}
 * @throws {DocumentNotFoundError} If board or parent thread not found
 * @throws {PostingError} If postData has missing or invalid values
 * @throws {CaptchaEntryNotFoundError} If captcha expired
 * @throws {IncorrectCaptchaError} If captcha is incorrect
 * @throws {FileFormatNotSupportedError} If attachment file type is not
 *    supported
 * @throws {ThumbnailGenerationError} If something went wrong during thumbnail
 *    creation
 * @throws {FileTooLargeError} If attachment file size exceeds
 *    board.maxFileSize
 * @returns {PostingResult} Created reply data
 */
module.exports.createReply = async (postData, posterInfo, options) => {
  _.defaults(options, {
    regenerate: true,
  });
  const { boardUri, threadId } = postData;
  const [thread, board] = await Promise.all([
      Thread.findThread(boardUri, threadId).exec(),
      Board.findBoard(boardUri).exec()
    ]);
  if (!board) {
    throw new DocumentNotFoundError('No such board: ' + boardUri, 'board', boardUri, 'body');
  }
  if (!thread) {
    throw new DocumentNotFoundError(`Thread ${ boardUri }/${ threadId } not found`, 'threadId', threadId, 'body');
  }
  const attachments = postData.attachments;
  checkAttachments(postData, board);
  checkComment(postData, board);
  await checkCatptcha('reply', board, options.captcha, posterInfo);
  // @todo Check ban
  // @todo Check posting rates and permanent sage

  if (attachments.length) {
    const uploaded = await uploadFiles(boardUri, attachments, board.keepOriginalFileName);
    postData.attachments = _.map(
      _.zip(postData.attachments, uploaded),
      ([postAttachment, uploadedAttachment]) => {
        return {
          ...uploadedAttachment,
          isSpoiler: postAttachment.isSpoiler,
          isNSFW: postAttachment.isNSFW,          
        };
      }
    );
  }

  if (!board.allowRepliesSubject) {
    postData.subject = '';
  }
  postData = populatePostDataDefaults(postData, posterInfo, board);
  postData.postId = board.postcount + 1;
  postData.parent = ObjectId(thread._id);

  const reply = new Reply(postData);
  await Parser.parsePost(reply);
  board.postcount = board.postcount + 1;
  board.uniquePosts = await Post.getNumberOfUniqueUserPosts(board.uri);
  await Promise.all([reply.save(), board.save()]);
  if (!postData.isSage) {
    const threadUpdateParams = {};
    threadUpdateParams.bumpedAt = reply.createdAt;
    await Thread
      .findByIdAndUpdate(ObjectId(thread._id), threadUpdateParams);
  }
  const updatedThread = await Thread
    .findThread(boardUri, threadId)
    .populate('children');
  // populate virtual field board to avoid another query to DB
  updatedThread.board = board;
  if (options.regenerate) {
    await generateThread(updatedThread);
    await generateBoardPagesAndCatalog(board);    
  }
  const location =
    `/${ reply.boardUri }/res/${ reply.threadId }.html#post-${ reply.boardUri }-${ reply.postId }`;
  return Object.freeze({
    postId   : reply.postId,
    boardUri : reply.boardUri,
    threadId : reply.threadId,
    location : location,
  });
};


/**
 * @typedef {Object} DeletePostsResult
 * @property {Number} threads How many threads were deleted
 * @property {Number} replies How many replies were deleted
 * @property {Number} attachments How many attachments were deleted
 */

/**
 * Remove selected posts from database and corresponding attachment files
 * @async
 * @param {Array.<Post>} postsToDelete     Array of post mongoose documents
 * @param {Boolean}      [regenerate=true] Regenerate corresponding html files
 * @returns {DeletePostsResult} An object with fields containing a number of
 *    how many threads, replies or attachments were deleted
 */
module.exports.deletePosts = async (postsToDelete, regenerate = true) => {
  // leave only unique posts just in case
  postsToDelete = [...new Set(postsToDelete)];
  // all board pages that contain deleted posts will be regenerated
  const boardsToRegenerate = [...new Set(
    postsToDelete.map(p => ({ uri: p.boardUri}))
  )];
  // if threads was selected for deletion, replies also has to be deleted
  const threadsToDelete = postsToDelete.filter(p => p.isOp);
  const threadsRepliesIds = threadsToDelete
    // extract arrays of children from threads
    .map(t => t.children)
    // flatten to single array
    .reduce((a, b) => a.concat(b), [])
    // exclude ids of posts that are already selected for deletion
    .filter(id => !postsToDelete.find(post => post._id.equals(id)));

  // normal non-op posts selected for deletion
  const repliesToDelete = postsToDelete.filter(p => !p.isOp);
  // threads that contain posts selected for deletion will be regenerated
  const threadsToRegenerate = repliesToDelete
    // but not threads that will be deleted themselves
    .filter(p => !threadsToDelete.find(t => t._id.equals(p.threadId)))
    .map(p => ({ boardUri: p.boardUri, postId: p.threadId }));

  if (threadsRepliesIds.length) {
    // select replies to deleted threads from database
    const threadsReplies = await Post.findPostsByIds(threadsRepliesIds);
    // add replies to deleted threads to deletion list
    postsToDelete = postsToDelete.concat(threadsReplies);
  }

  // now figure out file paths of attachments to deleted posts
  const attachmentsToDelete = postsToDelete
    // extract arrays of attachments form posts
    .map(post => post.attachments)
    // flatten array of attachments
    .reduce((a, b) => a.concat(b), []);
  const attachmentFilesToDelete = attachmentsToDelete
    .map(attachment => [
      path.join(config.html_path, path.dirname(attachment.file)),
      path.join(config.html_path, attachment.thumb)
    ])
    // flatten result again to get plain array of paths to both thumbs and originals
    .reduce((a, b) => a.concat(b), []);

  // delete thread.html, thread-preview.html, images and thumbnail files
  const delThreadsPaths = threadsToDelete.map(t =>
    path.join(config.html_path, t.boardUri, 'res', t.threadId.toString()));
  const filesToDelete = [
    ...delThreadsPaths.map(p => p + '.html'),
    ...delThreadsPaths.map(p => p + '-preview.html'),
    ...attachmentFilesToDelete
  ];

  // prelude ends here, now actually do stuff
  if (postsToDelete.length) {
    // delete posts from database
    const deleteMongoIds = postsToDelete.map(p => p._id);
    await Post.deleteMany({
      _id: { $in: deleteMongoIds }
    });

    // delete all replies and references from other posts in database
    await Post.update({
        $or: [
          {'replies.src': { $in: deleteMongoIds }},
          {'references.src': { $in: deleteMongoIds }}
        ]
      }, {
        $pull: {
          replies: { src: { $in: deleteMongoIds } },
          references: { src: { $in: deleteMongoIds } }
        }
      })
      .exec();
  }
  if (regenerate && boardsToRegenerate.length) {
    const boards = await Board.find({ $or: boardsToRegenerate });
    const boardsDict = _.groupBy(boards, 'boardUri');

    // regenerate threads
    if (threadsToRegenerate.length) {
      const populteThreadBoard = (t) => {
        t.board = boardsDict[t.boardUri];
        return t;
      };
      await Thread.findThreads(threadsToRegenerate)
        .populate('children')
        .then(threads =>
            Promise.all(
              threads
                .map(populteThreadBoard)
                .map(generateThread)
              ));
    }
    // regenerate boards
    await Promise.all(boards.map(generateBoardPagesAndCatalog));
  }
  // delete files
  if (filesToDelete.length) {
    await Promise.all(filesToDelete.map(f =>
      new Promise((resolve, reject) => fs.remove(f, () => resolve()))));
  }

  return {
    threads: threadsToDelete.length,
    replies: repliesToDelete.length,
    attachments: attachmentsToDelete.length
  };
};


/**
 * Update fields of posts and save it to DB.
 * @async
 * @example
 *
 * const items = [
 *   {
 *     target: { _id: ObjectId(...), boardUri: 'b', postId: 123, ... },  // Post document
 *     update: {
 *       'attachments.0.isDeleted': { value: true, priority: 100, roleName: 'moderator' },
 *       'attachments.1.isDeleted': { value: true, priority: 100, roleName: 'moderator' }
 *     }
 *   },
 *   {
 *     target: { _id: ObjectId(...), boardUri: 'b', postId: 456, ... },  // Post document
 *     update: {
 *       'isSticky': { value: true, priority: 100, roleName: 'moderator' }
 *     }
 *   },
 *   {
 *     target: { _id: ObjectId(...), boardUri: 'a', postId: 789, ... },  // Post document
 *     update: {
 *       'isSage': { value: true, priority: 100, roleName: 'moderator' }
 *     }
 *   },
 * ];
 * await updatePosts(items, true);
 *
 * @param {Array.<Object>} items - array of post mongoose documents
 * @param {boolean} [regenerate=true] - regenerate corresponding html files
 * @returns result of Post.bulkWrite, or an empty object if no posts were
 * updated
 */
module.exports.updatePosts = async (items, {ip, useragent, user}, regenerate=false) => {
  if (_.isEmpty(items)) {
    return {};
  }

  const invalidItems = [];
  const validItems = [];
  const changesList = [];
  for (let item of items) {
    const post = item.target;
    let updateValues = _.mapValues(item.update, 'value');
    let updatePriorities = _.mapValues(item.update, 'priority');

    const notChanged = Object
      .keys(updateValues)
      .filter((key) => {
        const sameValue = post.get(key) === updateValues[key];
        const samePriority = updatePriorities[key] === post.get(`changes.${key}`);
        return sameValue && samePriority;
      });

    if (notChanged.length) {
      const notChangedUpdates = _.pick(updateValues, notChanged);
      const notChangedItem = {
        target: _.pick(post, ['boardUri', 'postId']),
        update: notChangedUpdates,
        status: 204,
      };
      invalidItems.push(notChangedItem);
      updateValues = _.omit(updateValues, notChanged);
      updatePriorities = _.omit(updatePriorities, notChanged);
    }

    if (_.isEmpty(updateValues)) {
      continue;
    }

    const originalPost = post.toObject();
    post.set(updateValues);
    const validationError = await post.validate();

    if (validationError) {
      const errorPaths = _.filter(_.map(_.values(validationError.errors), 'path'));
      const invalidUpdates = _.pick(updateValues, errorPaths);

      updateValues = _.omit(updateValues, errorPaths);
      updatePriorities = _.omit(updatePriorities, errorPaths);

      for (let errorPath of errorPaths) {
        const errorAtPath = validationError.errors[errorPath];
        const invalidItem = {
          target: _.pick(post, ['boardUri', 'postId']),
          update: invalidUpdates,
          status: 400,
          error: { code: errorAtPath.name, message: errorAtPath.message },
        };
        invalidItems.push(invalidItem);
      }
    }

    const newChanges = Object.keys(updateValues).map((key) =>
      ({
        target: item.target._id,
        model: 'Post',
        property: key,
        oldValue: _.get(originalPost, key),
        newValue: _.get(updateValues, key),
        oldPriority: _.get(originalPost, ['changes', key]),
        newPriority: _.get(updatePriorities, key),
        roleName: item.update[key].roleName,
      })
    );
    changesList.push(newChanges);

    updatePriorities = _.mapKeys(updatePriorities, (value, key) => `changes.${key}`);
    const update = { ...updateValues, ...updatePriorities };
    if (!_.isEmpty(update)) {
      item.update = update;
      validItems.push(item);
    }
  }

  if (!validItems.length) {
    return { success: [], fail: invalidItems };
  }

  const updatePostQuery = validItems.map(item =>
    ({
      updateOne: {
        filter: { _id: item.target._id, __t: item.target.__t },
        update: item.update,
      },
    }));
  const [updateReplies, updateThreads] =
    _.partition(updatePostQuery, item => item.updateOne.filter.__t === 'Reply');
  const modlogData = {
    ip: ip,
    useragent: useragent,
    user: user,
    changes: _.flatten(changesList),
    regenerate: regenerate,
  };
  const promises = [ModlogEntry.create(modlogData)];
  if (updateThreads.length) {
    promises.push(Thread.bulkWrite(updateThreads));
  }
  if (updateReplies.length) {
    promises.push(Reply.bulkWrite(updateReplies));
  }
  const response = await Promise.all(promises);

  if (regenerate) {
    const posts = validItems.map(_.property('target'));
    const [ threads, replies ] = _.partition(posts, (r) => r.isOp);

    const threadsAffected = _.unionBy(
      replies.map(_.property('parent')),
      threads.map(_.property('_id')),
      String);

    const threadDocuments = await Thread.findThreadsByIds(threadsAffected)
      .populate('children')
      .populate('board');

    await generateThreads(threadDocuments);

    const boardsAffected = _.uniqBy(
      threadDocuments.map(_.property('board')),
      String);

    const boardDocuments = await Board.findBoardsByIds(boardsAffected);

    await Promise.all(boardDocuments.map(bd => generateBoardPagesAndCatalog(bd)));
  }

  return {
    fail: invalidItems,
    success: validItems.map(item => ({
        ref: _.omit(item.target.toReflink(), 'src'),
        updated: _.pickBy(item.update, (val, key) => !key.startsWith('changes.')),
        status: 200,
      })),
  };
};
