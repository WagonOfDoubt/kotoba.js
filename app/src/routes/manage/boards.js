const express = require('express');
const Board = require('../../models/board');
const locales = require('../../json/locales');
const { authRequired } = require('../../middlewares/permission');
const { findUserRoles } = require('../../middlewares/post');

const router = express.Router();

router.get('/boards/',
  authRequired,
  findUserRoles,
  async (req, res, next) => {
    try {
      const boards = await Board.apiQuery({
        select: [
          'uri',
          'name',
          'desc',
          'createdAt',
          'isLocked',
          'isHidden',
          'isForcedAnon',
          'postcount',
        ],
        limit: 1000,
        user: req.user,
        userRoles: req.userRoles,
      });
      if (!boards.docs || !boards.docs.length) {
        return res.status(404).render('manage/404');
      }
      return res.render('manage/boardselect', {
        activity: 'manage-page-boardselect',
        boards: boards.docs,
        title: 'Board options',
        locales: locales,
        crud: 'read',
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/boards/edit/:board',
  authRequired,
  findUserRoles,
  async (req, res, next) => {
    try {
      const boardUri = req.params.board;
      const board = await Board.apiQuery({
        filter: { uri: boardUri },
        limit: 1,
        select: ['all'],
        user: req.user,
        userRoles: req.userRoles,
      });
      if (!board) {
        return res.status(404).render('manage/404');
      }
      return res.render('manage/boardopts', {
        activity: 'manage-page-boardopts',
        board: board,
        boardDefaults: Board.defaults(),
        title: 'Board administration',
        locales: locales,
        crud: 'update',
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/boards/create',
  authRequired,
  findUserRoles,
  async (req, res, next) => {
    try {
      res.render('manage/boardopts', {
        activity: 'manage-page-addboard',
        boardDefaults: Board.defaults(),
        title: 'Add board',
        locales: locales,
        crud: 'create',
      });
    } catch (err) {
      next(err);
    }
  }
);


router.get('/boards/delete/:board',
  authRequired,
  findUserRoles,
  async (req, res, next) => {
    try {
      const board = await Board.apiQuery({
        filter: { uri: req.params.board },
        select: [
          'uri',
          'name',
          'desc',
        ],
        limit: 1,
        user: req.user,
        userRoles: req.userRoles,
      });

      if (!board) {
        return res.status(404).render('manage/404');
      }

      return res.render('manage/delboard', {
        activity: 'manage-page-delboard',
        board: board,
        title: 'Delete board',
        crud: 'delete',
      });
    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
