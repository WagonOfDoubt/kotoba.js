const express = require('express');
const _ = require('lodash');
const Report = require('../../models/report');
const Board = require('../../models/board');
const { authRequired } = require('../../middlewares/permission');
const { findUserRoles } = require('../../middlewares/post');
const { checkSchema } = require('express-validator');
const { restGetQueryFilter } = require('../../middlewares/reqparser');
const { validateRedirect, filterMatched } = require('../../middlewares/validation');


const router = express.Router();


const handler = async (req, res, next) => {
  try {
    const boardsListToQuery = (brds) => `filter=boardUri:$in([${brds.map(b => '"' + b + '"').join('|')}])`;

    const isTrash = res.locals.isTrash || false;

    if (req.query.boards) {
      if (!_.isArray(req.query.boards)) {
        req.query.boards = [req.query.boards];
      }
      return res.redirect('?' + boardsListToQuery(req.query.boards));
    }

    const userRoles = req.userRoles;
    const canViewReports = ([b, r]) => _.get(r, 'reportActions.canViewReports', false);
    const boardsAvailable = _.map(_.filter(_.toPairs(userRoles), canViewReports), _.head);
    let availableBoardsQuery = {};
    if (req.user.authority !== 'admin') {
      availableBoardsQuery = {
        uri: {
          $in: boardsAvailable,
        }
      };
    }
    const boardsRes = await Board.apiQuery({
      filter: availableBoardsQuery,
      select: ['uri'],
    });
    if (!boardsRes) {
      return res.status(404).render('manage/404');
    }

    const availableBoards = boardsRes.docs;
    let selectedBoards = availableBoards;
    const boardsFilter = _.get(req.query, 'filter.boardUri.$in');
    if (boardsFilter && boardsFilter.length) {
      selectedBoards = selectedBoards.filter((b) => {
        return boardsFilter.includes(b.uri);
      });
    }

    const reportsFilter = {};
    if (boardsFilter && boardsFilter.length) {
      reportsFilter.boardUri = {
        $in: boardsFilter,
      };
    }
    reportsFilter.isDeleted = isTrash;
    const page = req.query.page || 0;
    const reportsLimit = req.query.limit || 50;
    const skip = page * reportsLimit;
    const reports = await Report.apiQuery({
      limit: reportsLimit,
      skip: skip,
      count: true,
      filter: reportsFilter,
      sort: { createdAt: -1 },
      select: [
        '_id',
        'createdAt',
        'reflinks.boardUri',
        'reflinks.threadId',
        'reflinks.postId',
        'reflinks.isOp',
        'reason',
        'boardUri',
        'isDeleted',
        'posts',
      ],
      user: req.user,
      userRoles: req.userRoles,
    });

    const count = reports.count;
    const totalPages = Math.ceil(count / reportsLimit);
    let query = '';
    if (boardsFilter && boardsFilter.length) {
      query = boardsListToQuery(boardsFilter);
    }
    query += `&limit=${reportsLimit}`;
    const pageUrl = (pNum) => pNum === 0 ?
      `?${query}` :
      `?${query}&page=${pNum}`;
    const pages = _.map(_.range(totalPages), (pNum) => {
      return {
        url: pageUrl(pNum),
        label: pNum,
      };
    });
    const prevPage = page === 0 ? null : { url: pageUrl(page - 1) };
    const nextPage = page === totalPages - 1 ? null : { url: pageUrl(page + 1) };

    res.render('manage/reports', {
      activity: 'manage-page-reports',
      title: 'Reports',
      reports: reports.docs,
      boards: availableBoards,
      selectedBoards: selectedBoards,
      pagination: {
        prevPage: prevPage,
        nextPage: nextPage,
        pages: pages,
        current: page,
      },
      isTrash: isTrash,
    });
  } catch(err) {
    next(err);
  }
};


router.get('/reports',
  authRequired,
  checkSchema({
    ...restGetQueryFilter,
    page: {
      in: 'query',
      toInt: true,
    },
    limit: {
      in: 'query',
      toInt: true,
    },
  }),
  filterMatched,
  validateRedirect('/manage/reports'),
  findUserRoles,
  handler,
);


router.get('/trash/reports',
  authRequired,
  checkSchema({
    ...restGetQueryFilter,
    page: {
      in: 'query',
      toInt: true,
    },
    limit: {
      in: 'query',
      toInt: true,
    },
  }),
  filterMatched,
  validateRedirect('/manage/trash/reports'),
  findUserRoles,
  (req, res, next) => {
    res.locals.isTrash = true;
    next();
  },
  handler,
);


module.exports = router;
