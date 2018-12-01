const express = require('express');
const router = express.Router();
const { oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');

const boardController = require('../../controllers/board');
const Board = require('../../models/board');
const ModlogEntry = require('../../models/modlog');
const reqparser = require('../../middlewares/reqparser');
const middlewares = require('../../utils/middlewares');


// get board
router.get('/api/board/:boardUri?',
  middlewares.adminOnly,
  async (req, res, next) => {
    try {
      const boardUri = req.params.boardUri;
      const q = boardUri ? { uri: boardUri } : {};
      const board = await Board.findOne(q).exec();
      res.json(board.toObject({ minimize: false }));
    } catch (err) {
      return next(err);
    }
  }
);


// create board
router.put(
  '/api/board/',
  [
    body('data', 'Request body is empty')
      .exists(),
    body('data.uri', 'Board uri must not be empty')
      .isLength({ min: 1 }),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      console.log(req.body);
      const board = await boardController.createBoard(req.body.data);
      res.json({
        data: board,
        ok: 1
      });
    } catch (err) {
      return next(err);
    }
  }
);


// modify board
router.patch(
  '/api/board/:boardUri?',
  [
    oneOf([
      body('uri').isLength({ min: 1 }),
      param('boardUri').isLength({ min: 1 })
    ], 'Board uri must not be empty'),
    body('data').exists(),
    body('regenerate').exists().toBoolean(),
    middlewares.adminOnly,
    middlewares.validateRequest,
    reqparser.findBoard,
  ],
  async (req, res, next) => {
    try {
      const boardUri = req.params.boardUri || req.body.board;
      const {data, regenerate, board} = req.body;

      const changes = ModlogEntry.diff('Board', board._id, board.toObject(), data);
      if (!changes.length) {
        throw new Error('Nothing to change');
      }
      const status = await boardController.updateBoard(board, data, regenerate);
      await ModlogEntry.create({
        ip: req.ip,
        useragent: req.useragent,
        user: req.user,
        changes: changes,
        regenerate: regenerate,
      });
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


// delete board
router.delete('/api/board/:boardUri?',
  [
    oneOf([
      body('uri').isLength({ min: 1 }),
      param('boardUri').isLength({ min: 1 })
    ], 'Board uri must not be empty'),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      const boardUri = req.params.boardUri || req.body.uri;
      const status = await boardController.removeBoard(boardUri);
      res.json(status);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
