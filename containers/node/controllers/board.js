const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
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


module.exports.removeBoard = async (boardUri) => {
  const boardDir = path.join(config.html_path, boardUri);
  // remove all posts from this board first
  return Post.find({
    boardUri: boardUri
  })
    .remove()
    .exec()
    // remove board from database
    .then(
      Board.findOne({
        uri: boardUri
      })
      .remove()
      .exec()
    )
    // remove board directory and all its contents
    .then(fs.remove(boardDir));
};


module.exports.updateBoard = async (boardUri, data = {}, regenerate = false) => {
  delete data.uri;
  const promise = Board.findOneAndUpdate(
  {
    uri: boardUri
  },
  {
    $set: data
  },
  {
    new: true
  }).exec();
  if (regenerate) {
    return promise
      .then(generateBoard);
  }
  return promise;
};
