/**
 * Module handles rendering templates and saving them as static HTML files.
 *    Nothing here can make changes to database or have other side effects.
 * @module controllers/generate
 */

const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const pug = require('pug');
const _ = require('lodash');

const Settings = require('../models/settings');
const filters = require('../utils/filters');
const config = require('../json/config.json');
const Board = require('../models/board');
const Style = require('../models/style');
const {Thread} = require('../models/post');
const News = require('../models/news');
const pkg = require('../package.json');


/**
 * Helper function. Gets Settings object from database and returns object with
 *    parameters necessary for templates.
 * @async
 */
const getTemplateGlobals = async () => {
  const s = await Settings.get();
  const styles = await Style.findAll();
  const data = {
    site: s,
    lang: s.locale,
    pkg: pkg,
    config: config,
    styles: styles,
    filters: filters,
    basedir: config.html_path
  };
  return data;
};


/**
 * Helper function. Renders template with given data and saves it to dir as
 *    filename Also passes global template variables to template
 * @async
 * @param {String} dir Directory to save to.
 * @param {String} filename Filename of resulting file.
 * @param {String} template Name of pug template.
 * @param {Object} data Data to pass to pug template.
 */
const renderToFile = async (dir, filename, template, data) => {
  const path = `${ dir }/${ filename }`;
  const globals = await getTemplateGlobals();
  const templateData = Object.assign(globals, data);
  // If set to false, everything will be like ~30 times slower
  templateData.cache = true;
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
    console.error('fail to generate', filename, 'data:', data, err);
    throw error;
  }
};


/**
 * Generate thread reply page. Saves file board/res/[postId].html
 * @async
 * @param {module:models/post~Thread} thread Thread mongoose document
 * @static
 */
const generateThreadPage = async (thread) => {
  const board = thread.board;
  assert(board instanceof Board, 'post.board must be populated with document');

  const timeLabel = `generateThreadPage /${board.uri}/res/${thread.postId}.html`;
  console.time(timeLabel);

  const data = {
    board: board,
    thread: thread,
    replies: thread.children || [],
    isPage: false,
    stats: {},
  };
  data.stats.uniqueUserPosts = board.uniquePosts;
  if (board.locale) {
    data.lang = board.locale;
  }

  const dir = `${ config.html_path }/${ board.uri }/res`;
  const filename = `${ thread.postId }.html`;
  const template = './templates/threadpage.pug';
  await renderToFile(dir, filename, template, data);
  console.timeEnd(timeLabel);
  return thread;
};


/**
 * Generate cached thread fragment which will be displayed on board page. When
 *    thread is bumped, threads on board are shuffled, so each page of board
 *    must be regenerated. But there is no need to render each thread fragment
 *    since none of them was changed. Keeping rendered thread fragments lets
 *    avoid unnecessary database queries and increases overall performance.
 *    Saves file board/res/[postId]-preview.html
 * @async
 * @param {module:models/post~Thread} thread Thread mongoose document
 * @static
 */
const generateThreadPreview = async (thread) => {
  const board = thread.board;
  assert(board instanceof Board, 'post.board must be populated with document');

  const timeLabel = `generateThreadPreview /${board.uri}/res/${thread.postId}-preview.html`;
  console.time(timeLabel);

  const showReplies =
    thread.isSticky ? board.showRepliesSticky : board.showReplies;
  const children = (thread.children || []).filter((c) => !c.isDeleted);
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
    lang: board.locale,
    board: board,
    thread: thread,
    replies: notOmitted,
    omittedPosts: omittedPosts,
    omittedAttachments: omittedAttachments,
    isPage: true,
    stats: {},
  };
  data.stats.uniqueUserPosts = board.uniquePosts;
  const dir = `${ config.html_path }/${ board.uri }/res`;
  const filename = `${ thread.postId }-preview.html`;
  const template = './templates/includes/thread.pug';
  await renderToFile(dir, filename, template, data);
  console.timeEnd(timeLabel);
};


/**
 * Generate thread reply page and thread preview.
 * @async
 * @param {module:models/post~Thread} thread Thread mongoose document.
 * @returns {Promise}
 * @static
 */
const generateThread = async (thread) => {
  const board = thread.board;
  assert(board instanceof Board, 'post.board must be populated with document');
  return Promise.all([
    generateThreadPage(thread),
    generateThreadPreview(thread)
  ]);
};


/**
 * Generate thread reply page and thread preview for each thread.
 * @param {Array<module:models/post~Thread>} threads Array of threads to
 *    display on page
 * @returns {Promise}
 * @static
 */
const generateThreads = threads =>
  Promise.all(threads.map(generateThread));


/**
 * Generate one page of board. Threads on page are not rendered, but included
 *    from -preview.html files. Saves file board/index.html or
 *    board/[pNum].html
 * @async
 * @param {module:models/board~Board} board The board mongoose document.
 * @param {Array<module:models/post~Thread>} threads Array of threads to
 *    display on page.
 * @param {Number} pNum Current page. If 0, file will be named index.html
 * @param {Number} totalPages Number of pages for pages selector.
 * @static
 */
const generateBoardPage = async (board, threads, pNum, totalPages) => {
  const timeLabel = `generateBoardPage /${board.uri}/${pNum}.html`;
  console.time(timeLabel);
  const files = threads.map((thread) =>
    `${ config.html_path }/${ board.uri }/res/${ thread.postId }-preview.html`);
  const promises = files.map(filepath => {
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, (err, fileData) => {
        if (err) {
          console.error(err);
          const filename = path.basename(filepath);
          resolve(`<div class='error'>ERROR: unable to read file ${filename}</div>`);
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
  data.stats.uniqueUserPosts = board.uniquePosts;
  if (board.locale) {
    data.lang = board.locale;
  }

  const dir = `${ config.html_path }/${ board.uri }`;
  const filename = getPageUrl(pNum);
  const template = './templates/boardpage.pug';
  await renderToFile(dir, filename, template, data);
  console.timeEnd(timeLabel);
};


/**
 * Generate all pages on given board. Saves files board/index.html,
 *    board/1.html, ..., board/n.html
 * @async
 * @param {module:models/board~Board} board The board mongoose document.
 * @param {?Array<module:models/post~Thread>} [threads] Array of threads
 *    sorted by bump order.
 * @returns {module:models/board~Board} same board that was passed as the
 *    first argument
 * @static
 */
const generateBoardPages = async (board, threads = null) => {
  const timeLabel = `generateBoardPages /${board.uri}/`;
  console.time(timeLabel);
  if (!threads) {
    threads = await Thread.getSortedThreads(board);
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
  console.timeEnd(timeLabel);
  return board;
};


/**
 * Generate catalog of board. Saves file board/catalog.html
 * @async
 * @param {module:models/board~Board} board The board mongoose document.
 * @param {?Array<module:models/post~Thread>} [threads] Array of threads
 *    sorted by bump order.
 * @returns {module:models/board~Board} same board that was passed as the
 *    first argument
 * @static
 */
const generateCatalog = async (board, threads = null) => {
  if (!board.features.catalog) {
    return board;
  }
  const timeLabel = `generateCatalog /${board.uri}/${config.catalog_filename}`;
  console.time(timeLabel);
  if (!threads) {
    threads = await Thread.getSortedThreads(board);
  }
  const data = {
    lang: board.locale,
    board: board,
    threads: threads,
    stats: {},
  };
  data.stats.uniqueUserPosts = board.uniquePosts;
  const filename = config.catalog_filename;
  const dir = `${ config.html_path }/${ board.uri }`;
  const template = './templates/catalogpage.pug';
  await renderToFile(dir, filename, template, data);
  console.timeEnd(timeLabel);
  return board;
};


/**
 * Regenerate all board pages and catalog for given board
 * @param {module:models/board~Board} board Board to regenerate.
 * @returns {Promise}
 * @static
 */
const generateBoardPagesAndCatalog = async board => {
  const threads = await Thread.getSortedThreads(board);
  await Promise.all([
    generateBoardPages(board, threads),
    generateCatalog(board, threads)
  ]);
};


/**
 * Regenerate all board pages, thread reply pages and catalog for given board
 * @param {module:models/board~Board} board Board to regenerate.
 * @returns {Promise}
 * @static
 */
const generateBoard = async board => {
  const threads = await Thread.getSortedThreads(board);
  await generateThreads(threads);
  await Promise.all([
    generateBoardPages(board, threads),
    generateCatalog(board, threads)
  ]);
};


/**
 * Regenerate all board pages, thread reply pages and catalog for all given
 *    boards
 * @param {Array<module:models/board~Board>} threads Array of boards to
 *    regenerate.
 * @returns {Promise}
 * @static
 */
const generateBoards = boards =>
  Promise.all(boards.map(generateBoard));


/**
 * Generate main page (/index.html)
 * @async
 * @static
 */
const generateMainPage = async () => {
  const timeLabel = `generateMainPage`;
  console.time(timeLabel);
  const news = await News.find().sort({ createdAt: -1 }).exec();
  const data = {
    news: news
  };
  const dir = config.html_path;
  const template = './templates/mainpage.pug';
  await renderToFile(dir, 'index.html', template, data);
  console.timeEnd(timeLabel);
};


/**
 * Generate main page (/index.html) if it does not exist.
 * @async
 * @static
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
 * @param {Object} options Options
 * @param {Boolean} [options.mainpage=true] Whether or not to regenerate main
 *    page
 * @param {String[]} [?options.boards=[]] List of boards (by board.uri) to
 *    regenerate. If empty, all boards will be regenerated (default).
 * @returns {Promise}
 * @static
 */
const regenerateAll = (options) => {
  options = options || {};
  if (!_.has(options, 'mainpage')) {
    options.mainpage = true;
  }
  const promises = [];
  if (options.mainpage) {
    promises.push(generateMainPage());
  }
  if (options.boards) {
    const q = {};
    if (options.boards.length) {
      q.uri = { $in: options.boards };
    }
    promises.push(
      Board
        .find(q)
        .exec()
        .then(generateBoards));
  }
  return Promise.all(promises);
};


/**
 * Clear compiled pug templates
 * @static
 * @function
 */
const clearTemplateCache = () => {
  for (const prop of Object.keys(pug.cache)) {
    delete pug.cache[prop];
  }
};


module.exports.generateThread = generateThread;
module.exports.generateThreads = generateThreads;
module.exports.generateBoardPagesAndCatalog = generateBoardPagesAndCatalog;
module.exports.generateBoard = generateBoard;
module.exports.generateBoards = generateBoards;
module.exports.generateMainPage = generateMainPage;
module.exports.ensureMainPage = ensureMainPage;
module.exports.regenerateAll = regenerateAll;
module.exports.clearTemplateCache = clearTemplateCache;
