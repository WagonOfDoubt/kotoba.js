/**
 * Module handles rendering templates and saving them as static HTML files.
 * Nothing here can make changes to database or have other side effects.
 * @module controllers/generate
 */

const fs = require('fs-extra');
const path = require('path');
const pug = require('pug');
const _ = require('lodash');

const Settings = require('../models/settings');
const filters = require('../utils/filters');
const config = require('../json/config.json');
const Board = require('../models/board');
const Post = require('../models/post');
const News = require('../models/news');
const pkg = require('../package.json');


/**
 * Helper function.
 * Gets Settings object from database
 * and returns object with parameters necessary for templates.
 * @async
 */
const getTemplateGlobals = async () => {
  const s = await Settings.get();
  const data = {
    site: s,
    lang: s.locale,
    pkg: pkg,
    config: config,
    filters: filters,
    basedir: config.html_path
  };
  return data;
};


/**
 * Helper function.
 * Renders template with given data and saves it to dir as filename
 * Also passes global template variables to template
 * @async
 * @param {String} dir - Directory to save to.
 * @param {String} filename - Filename of resulting file.
 * @param {String} template - Name of pug template.
 * @param {Object} data - Data to pass to pug template.
 */
const renderToFile = async (dir, filename, template, data) => {
  const path = `${ dir }/${ filename }`;
  const globals = await getTemplateGlobals();
  const templateData = Object.assign(globals, data);
  try {
    await fs.ensureDir(dir);
    await fs.writeFile(path, pug.renderFile(template, templateData));
  } catch (err) {
    /**
     * @todo create TemplateRenderingError class
     */
    const error = new Error('fail to generate ' + filename);
    error.data = data;
    error.error = err;
    console.log('fail to generate', filename, 'data:', data, err);
    throw error;
  }
};


/**
 * Generate thread reply page.
 * Saves file board/res/[postId].html
 * @async
 * @param {Post} thread - The op-post mongoose document.
 */
const generateThreadPage = async (thread) => {
  const board = await Board.findBoards(thread.boardUri).exec();

  const data = {
    board: board,
    thread: thread,
    replies: thread.children,
    isPage: false,
    stats: {},
  };
  data.stats.uniqueUserPosts = await board.getUniqueUserPosts();
  if (board.locale) {
    data.lang = board.locale;
  }

  const dir = `${ config.html_path }/${ board.uri }/res`;
  const filename = `${ thread.postId }.html`;
  const template = './templates/threadpage.pug';
  await renderToFile(dir, filename, template, data);
  console.log('generateThreadPage', board.uri, thread.postId);
  return thread;
};


/**
 * Generate cached thread fragment which will be displayed on board page.
 * When thread is bumped, threads on board are shuffled, so each page of board
 * must be regenerated. But there is no need to render each thread fragment
 * since none of them was changed. Keeping rendered thread fragments lets avoid
 * unnecessary database queries and increases overall performance.
 * Saves file board/res/[postId]-preview.html
 * @async
 * @param {Post} thread - The op-post mongoose document.
 */
const generateThreadPreview = async (thread) => {
  const board = await Board.findBoards(thread.boardUri).exec();
  const showReplies =
    thread.isSticky ? board.showRepliesSticky : board.showReplies;
  const children = thread.children.filter((c) => !c.isDeleted);
  const omitted = children.slice(0, children.length - showReplies);
  const omittedPosts = omitted.length;
  let omittedAttachments = 0;
  if (omitted.length) {
    omittedAttachments = omitted
      .reduce((acc, reply) => {
        return acc + (reply.attachments ? reply.attachments.length : 0);
      }, 0);
  }
  const notOmitted = children.slice(-showReplies);

  const data = {
    lang: board.locale || globals.lang,
    board: board,
    thread: thread,
    replies: notOmitted,
    omittedPosts: omittedPosts,
    omittedAttachments: omittedAttachments,
    isPage: true,
    stats: {},
  };
  data.stats.uniqueUserPosts = await board.getUniqueUserPosts();
  const dir = `${ config.html_path }/${ board.uri }/res`;
  const filename = `${ thread.postId }-preview.html`;
  const template = './templates/includes/thread.pug';
  await renderToFile(dir, filename, template, data);
  console.log('generateThreadPreview', board.uri, thread.postId);
};


/**
 * Generate thread reply page and thread preview.
 * @async
 * @param {Post} thread - The op-post mongoose document.
 * @returns {Promise}
 */
const generateThread = thread =>
  Promise.all([
    generateThreadPage(thread),
    generateThreadPreview(thread)
  ]);


/**
 * Generate thread reply page and thread preview for each thread.
 * @param {Array} threads - Array of {Post} threads to display on page.
 * @returns {Promise}
 */
const generateThreads = threads =>
  Promise.all(threads.map(generateThread));


/**
 * Generate one page of board.
 * Threads on page are not rendered, but included from -preview.html files.
 * Saves file board/index.html or board/[pNum].html
 * @async
 * @param {Board} board - The board mongoose document.
 * @param {Array} threads - Array of {Post} threads to display on page.
 * @param {Number} pNum - Current page. If 0, file will be named index.html
 * @param {Number} totalPages - Number of pages for pages selector.
 */
const generateBoardPage = async (board, threads, pNum, totalPages) => {
  const files = threads.map((thread) =>
    `${ config.html_path }/${ board.uri }/res/${ thread.postId }-preview.html`);
  const promises = files.map(filepath => {
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, (err, fileData) => {
        if (err) {
          reject(err);
        } else {
          resolve(fileData);
        }
      });
    });
  });
  const threadPreivews = await Promise.all(promises);

  const startWithOne = await Settings.get('startWithOne');
  const getPageLabel = (i) => {
    if (startWithOne) {
      return i + 1;
    }
    return i;
  };
  const getPageUrl = (i) => {
    if (i === 0) {
      return 'index.html';
    }
    if (startWithOne) {
      return `${ i + 1 }.html`;
    }
    return `${ i }.html`;
  };
  const pages = _.range(totalPages).map(i => ({
    url: `/${ board.uri }/${ getPageUrl(i) }`,
    label: getPageLabel(i),
  }));
  const data = {
    board: board,
    threads: threadPreivews,
    isPage: true,
    pagination: {
      current: pNum,
      pages: pages
    },
    stats: {},
  };
  data.stats.uniqueUserPosts = await board.getUniqueUserPosts();
  if (board.locale) {
    data.lang = board.locale;
  }

  const dir = `${ config.html_path }/${ board.uri }`;
  const filename = getPageUrl(pNum);
  const template = './templates/boardpage.pug';
  await renderToFile(dir, filename, template, data);
  console.log('generateBoardPage', board.uri, pNum);
};


/**
 * Generate all pages on given board.
 * @async
 * Saves files board/index.html, board/1.html, ..., board/n.html
 * @param {Board} board - The board mongoose document.
 * @param {Array} threads - Array of threads sorted by bump order.
 * @returns {Board} - same board that was passed as the first argument
 */
const generateBoardPages = async (board, threads) => {
  if (!threads) {
    threads = await Post.getSortedThreads(board);
  }
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
  console.log('generateBoardPages', board.uri);
  return board;
};


/**
 * Generate catalog of board.
 * Saves file board/catalog.html
 * @async
 * @param {Board} board - The board mongoose document.
 * @param {Array} threads - Array of threads sorted by bump order.
 * @returns {Board} - same board that was passed as the first argument
 */
const generateCatalog = async (board, threads = null) => {
  if (!board.features.catalog) {
    return board;
  }
  if (!threads) {
    threads = await Post.getSortedThreads(board).populate('children');
  }
  const data = {
    lang: board.locale || globals.lang,
    board: board,
    threads: threads,
    stats: {},
  };
  data.stats.uniqueUserPosts = await board.getUniqueUserPosts();
  const filename = config.catalog_filename;
  const dir = `${ config.html_path }/${ board.uri }`;
  const template = './templates/catalogpage.pug';
  await renderToFile(dir, filename, template, data);
  console.log('generateCatalog', board.uri);
  return board;
};


/**
 * Regenerate all board pages and catalog for given board
 * @param {Board} board - Board to regenerate.
 * @returns {Promise}
 */
const generateBoardPagesAndCatalog = board =>
  Post.getSortedThreads(board).populate('children')
    .then(threads => Promise.all([
      generateBoardPages(board, threads),
      generateCatalog(board, threads)
    ]));


/**
 * Regenerate all board pages, thread reply pages and catalog for given board
 * @param {Board} board - Board to regenerate.
 * @returns {Promise}
 */
const generateBoard = board =>
  Post.getSortedThreads(board).populate('children')
    .then(threads => Promise.all([
      generateThreads(threads)
        .then(generateBoardPages(board, threads)),
      generateCatalog(board, threads)
    ]));


/**
 * Regenerate all board pages, thread reply pages and catalog for all given boards
 * @param {Array} threads - Array of {Board} boards to regenerate.
 * @returns {Promise}
 */
const generateBoards = boards =>
  Promise.all(boards.map(generateBoard));


/**
 * Generate main page (/index.html)
 * @async
 */
const generateMainPage = async () => {
  const news = await News.find().sort({ postedDate: -1 }).exec();
  const data = {
    news: news
  };
  const dir = config.html_path;
  const template = './templates/mainpage.pug';
  await renderToFile(dir, 'index.html', template, data);
  console.log('generateMainPage');
};


/**
 * Generate main page (/index.html) if it does not exist.
 * @async
 */
const ensureMainPage = async () => {
  const indexPath = path.join(config.html_path, 'index.html');
  const indexExists = await fs.pathExists(indexPath);
  if (!indexExists) {
    await generateMainPage();
  }
};


/**
 * Regenerate all static html.
 * @returns {Promise}
 */
const regenerateAll = () =>
  Promise.all([
    generateMainPage,
    Board
      .findBoards()
      .exec()
      .then(generateBoards)
    ]);


module.exports.generateThreadPage = generateThreadPage;
module.exports.generateThreadPreview = generateThreadPreview;
module.exports.generateThread = generateThread;
module.exports.generateThreads = generateThreads;
module.exports.generateBoardPage = generateBoardPage;
module.exports.generateBoardPages = generateBoardPages;
module.exports.generateCatalog = generateCatalog;
module.exports.generateBoardPagesAndCatalog = generateBoardPagesAndCatalog;
module.exports.generateBoard = generateBoard;
module.exports.generateBoards = generateBoards;
module.exports.generateMainPage = generateMainPage;
module.exports.ensureMainPage = ensureMainPage;
module.exports.regenerateAll = regenerateAll;
