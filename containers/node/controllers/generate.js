const fs = require('fs');
const pug = require('pug');

const Settings = require('../models/settings');
const filters = require('../utils/filters');
const config = require('../config.json');
const Board = require('../models/board');
const Post = require('../models/post');
const News = require('../models/news');
const pkg = require('../package.json');


const getTemplateGlobals = async () => {
  const s = await Settings.get();
  const data = {
    site: s,
    lang: s.locale,
    pkg: pkg,
    filters: filters,
    basedir: config.html_path
  };
  return data;
};


const regenerateAll = async () => {
  const regenerateAllThreadsOnBoard = threads =>
    Promise.all(threads.map((thread) =>
      Promise.all([
        generateThread(thread),
        generateThreadPreview(thread)
      ]))
    );
  const regenerateAllBoards = boards =>
    Promise.all(boards.map(board =>
      Promise.all([
        Post.findThreads(board.uri)
          .then(regenerateAllThreadsOnBoard)
          .then(() => generateBoard(board)),
        generateCatalog(board)
      ])));
  return Promise.all([
    Board
      .findBoards()
      .exec()
      .then(regenerateAllBoards)
    ]).catch(err => {
      throw err;
    });
};


const generateBoard = async (board) => {
  const threads = await Post
    .find({
      boardUri: board.uri,
      parent: { $exists: false }
    })
    .select('postId')
    .limit(board.maxPages * board.maxThreadsOnPage)
    .sort({ isSticky: -1, bumped: -1})
    .exec();
  if (!threads.length) {
    await generateBoardPage(board, [], 0, 1);
    return board;
  }
  const threadsPerPage = board.maxThreadsOnPage;
  // split array of threads into chunks ad generate page for each chunk
  await Promise.all(threads
    .map((e, i) =>
      (i % threadsPerPage === 0) && (threads.slice(i, i + threadsPerPage)))
    .filter(e => e)
    .map(async (e, i, arr) => {
      await generateBoardPage(board, e, i, arr.length);
      return e;
    }));
  console.log('generateBoard', board.uri);
  return board;
};


const generateBoardPage = async (board, threads, pNum, totalPages) => {
  const files = threads.map((thread) =>
    `${ config.html_path }/${ board.uri }/res/${ thread.postId }-preview.html`);
  const promises = files.map(filepath => {
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, (err, fileData) => {
        if (err) {
          reject(err);
        } else {
          resolve(fileData)
        }
      });
    });
  });
  const threadPreivews = await Promise.all(promises);

  const globals = await getTemplateGlobals();
  const data = {
    ...globals,
    lang: board.locale || globals.lang,
    board: board,
    threads: threadPreivews,
    isPage: true,
    pagination: {
      current: pNum,
      total: totalPages
    },
  };

  const dir = `${ config.html_path }/${ board.uri }`;
  const filename = pNum === 0
    ? 'index.html'
    : `${ pNum }.html`;
  const template = './templates/boardpage.pug';
  renderToFile(dir, filename, template, data);
  console.log('generateBoardPage', board.uri, pNum);
};


const generateThread = async (thread) => {
  const board = await Board.findBoards(thread.boardUri).exec();

  const globals = await getTemplateGlobals();
  const data = {
    ...globals,
    lang: board.locale || globals.lang,
    board: board,
    thread: thread,
    replies: thread.children,
    isPage: false,
  };
  const dir = `${ config.html_path }/${ board.uri }/res`;
  const filename = `${ thread.postId }.html`;
  const template = './templates/threadpage.pug';
  renderToFile(dir, filename, template, data);
  console.log('generateThread', board.uri, thread.postId);
  return thread;
};


const generateThreadPreview = async (thread) => {
  const board = await Board.findBoards(thread.boardUri).exec();
  const showReplies = thread.isSticky
    ? board.showRepliesSticky
    : board.showReplies;
  const children = thread.children;
  const omitted = children.slice(0, children.length - showReplies);
  const omittedPosts = omitted.length;
  const omittedAttachments = omitted.length
    ? omitted
      .reduce((acc, reply) => {
        return acc + (reply.attachments ? reply.attachments.length : 0);
      }, 0)
    : 0;
  const notOmitted = children.slice(-showReplies);

  const globals = await getTemplateGlobals();
  const data = {
    ...globals,
    lang: board.locale || globals.lang,
    board: board,
    thread: thread,
    replies: notOmitted,
    omittedPosts: omittedPosts,
    omittedAttachments: omittedAttachments,
    isPage: true,
  };
  const dir = `${ config.html_path }/${ board.uri }/res`;
  const filename = `${ thread.postId }-preview.html`;
  const template = './templates/includes/thread.pug';
  renderToFile(dir, filename, template, data);
  console.log('generateThread', board.uri, thread.postId);
};


const generateCatalog = async (board) => {
  const globals = await getTemplateGlobals();
  const data = {
    ...globals,
    lang: board.locale || globals.lang,
    board: board,
  };
  console.log('generateCatalog', board.uri);
  return board;
};


const generateMainPage = async () => {
  const globals = await getTemplateGlobals();
  const news = await News.find().sort({ postedDate: -1 }).exec();
  const data = {
    ...globals,
    news: news
  };
  const dir = config.html_path;
  const template = './templates/mainpage.pug';
  renderToFile(dir, 'index.html', template, data);
  console.log('generateMainPage');
};


const renderToFile = (dir, filename, template, data) => {
  const path = `${ dir }/${ filename }`;
  const dirExists = fs.existsSync(dir);
  if (!dirExists) {
    fs.mkdirSync(dir);
  }
  fs.writeFileSync(path, pug.renderFile(template, data));
};


module.exports.regenerateAll = regenerateAll;
module.exports.generateBoard = generateBoard;
module.exports.generateBoardPage = generateBoardPage;
module.exports.generateThread = generateThread;
module.exports.generateThreadPreview = generateThreadPreview;
module.exports.generateCatalog = generateCatalog;
module.exports.generateMainPage = generateMainPage;
