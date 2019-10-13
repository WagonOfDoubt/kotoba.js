/**
 * Board Create/Update/Delete module
 * @module controllers/board
 */

const fs = require('fs-extra');
const path = require('path');
const config = require('../json/config.json');
const { generateBoard } = require('./generate');
const Board = require('../models/board');
const {Post} = require('../models/post');


/**
 * Create new board, save to database and generate static HTML files
 * @param  {Object}  data       Board data
 * @return {module:models/board~Board}  Board document
 */
module.exports.createBoard = async (data) => {
  const board = new Board(data);
  await board
    .save()
    .then(generateBoard);
  return board;
};


/**
 * Remove board for database and remove static HTML files
 * @param  {module:models/board~Board}  board      Board document
 * @param  {Object}  data       Updates object
 * @return {Array}              [postsDeleted, boardsDeleted ]
 */
module.exports.removeBoard = async (board) => {
  const boardDir = path.join(config.html_path, board.uri);
  const [ postsDeleted, boardsDeleted ] = await Promise.all([
      Post.deleteMany({ boardUri: board.uri }),
      Board.deleteOne({ uri: board.uri }),
      fs.remove(boardDir),
    ]);
  return [postsDeleted.n, boardsDeleted.n ];
};


/**
 * Modify board
 * @param  {module:models/board~Board}  board      Board document
 * @param  {Object}  data       Updates object
 * @param  {Boolean} regenerate Whether or not to regenerate static HTML files
 * @return {Object}             Mongo response
 */
module.exports.updateBoard = async (board, data = {}, regenerate = false) => {
  let status = null;
  try {
    board.set(data);
    status = await board.save({ validateBeforeSave: true });
    if (regenerate) {
      await generateBoard(board);    
    }
  } catch (error) {
    throw error;
  }
  return status;
};
