const fs = require('fs-extra');
const path = require('path');
const config = require('../json/config.json');
const { generateBoard, generateCatalog } = require('./generate');
const Board = require('../models/board');
const Post = require('../models/post');

module.exports.createBoard = async (data) => {
  const board = new Board(data);
  await board
    .save()
    .then(generateBoard);
  return board;
};


module.exports.removeBoard = async (board) => {
  const boardDir = path.join(config.html_path, board.uri);
  const [ postsDeleted, boardsDeleted ] = await Promise.all([
      Post.deleteMany({ boardUri: board.uri }),
      Board.deleteOne({ uri: board.uri }),
      fs.remove(boardDir),
    ]);
  return [postsDeleted.n, boardsDeleted.n ];
};


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
