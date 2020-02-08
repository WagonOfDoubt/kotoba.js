const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');
const _ = require('lodash');
const fp = require('lodash/fp');

const { adminOnly, apiAuthRequired } = require('../../middlewares/permission');
const { findUserRoles } = require('../../middlewares/post');
const { validateRequest, filterMatched } = require('../../middlewares/validation');
const { filterPostTargetItems,
  populatePostUpdateItems } = require('../../middlewares/post');
const Report = require('../../models/report');
const Role = require('../../models/role');
const { PermissionDeniedError } = require('../../errors');
const { populateDocumentsByIds,
  removeDuplicates,
  compareRequestWithDocuments,
  applyAndValidateDocuments } = require('../../middlewares/restapi');
const { restGetQuerySchema } = require('../../middlewares/reqparser');
const { createGetRequestHandler } = require('../../middlewares/restapi');


/**
 * @api {get} /api/report Get Reports
 * @apiName GetReport
 * @apiGroup Report
 * @apiPermission Role.reportActions.canViewReports
 * @apiDescription Find one or more report based on query.
 * 
 * Search is ignored.
 *
 * Filter can be applied by: `_id`, `createdAt`, `boardUri`, `isDeleted`.
 *
 * Selectable fields are: `_id`, `createdAt`, `posts`, `posts`, `reflinks`,
 *    `reason`, `boardUri`, `isDeleted`.
 *
 * @apiUse GenericGetApi
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 */
router.get(
  '/api/report',
  checkSchema(restGetQuerySchema),
  validateRequest,
  filterMatched,
  findUserRoles,
  createGetRequestHandler('Report', false),
);


/**
 * @api {post} /api/report Create report
 * @apiName CreateReport
 * @apiGroup Report
 * @apiPermission anyone
 * @apiParam {String}   reason Text of complaint. Max length is 280
 *    characters.
 * @apiParam {Object[]} items Array of posts to report
 * @apiParam {Object}   items.target Reference to Post
 * @apiParam {String}   items.target.boardUri Post board
 * @apiParam {Number}   items.target.postId Post number
 * @apiSuccess {Object[]} success List of successful updates
 * @apiSuccess {Object}  success.ref Reflink to post
 * @apiSuccess {Number}  success.status HTTP status for this action
 * @apiSuccess {Object[]} fail List of updates that were rejected
 * @apiSuccess {Object}  fail.ref Reflink to post, if post was resolved
 * @apiSuccess {Object}  fail.target If post was not resolved, original target
 *    object that was in request
 * @apiSuccess {Number}  fail.status HTTP status for this action
 * @apiSuccess {Object}   fail.error  Error object (if only one error)
 * @apiSuccess {Object[]} fail.errors Errors objects (if multiple errors)
 * @apiError RequestValidationError Request did not pass validation
 * @apiError PostNotFoundError      Target Post not found
 */
router.post('/api/report',
  checkSchema({
    reason: {
      in: 'body',
      isLength: {
        errorMessage: 'Report text is too long (maximum is 280 characters)',
        options: { max: 280 },
      },
      trim: true,
    },
    items: {
      in: 'body',
      isArray: true,
    },
    'items.*.target.boardUri': {
      in: 'body',
      isLength: {
        options: { min: 1 },
      },
      matches: {
        options: [/^[a-z0-9_]+$/],
      }
    },
    'items.*.target.postId': {
      in: 'body',
      isInt: true,
      toInt: true,
    },
  }),
  validateRequest,
  filterPostTargetItems,
  populatePostUpdateItems,
  async (req, res, next) => {
    try {
      const reflinks = req.body.items.map(item => item.target.toReflink());
      const reason = req.body.reason;
      const ip = req.ip;
      const useragent = req.useragent;
      const boards = _.groupBy(reflinks, 'boardUri');
      const newReports = _.map(_.toPairs(boards), ([boardUri, refs]) => {
        return new Report({
          ip        : ip,
          useragent : useragent,
          reason    : reason,
          reflinks  : refs,
          boardUri  : boardUri,
        });
      });
      const savedDocs = await Promise.all(_.map(newReports, r => r.save()));
      const savedReflinks = _.flatten(_.map(savedDocs, 'reflinks'));

      res
        .status(200)
        .json({
          success: _.map(savedReflinks, (r) => ({ref: r})),
        });
    } catch (err) {
      next(err);
    }
  });


/**
 * @api {patch} /api/report Modify report
 * @apiName ModifyReport
 * @apiGroup Report
 * @apiPermission Role.reportPermissions.*
 * @apiParam {Object[]} items Array of reports and updates
 * @apiParam {Object}   items.target Reference to specific report
 * @apiParam {ObjectId} items.target._id Report mongo ObjectId
 * @apiParam {Object}   items.update Update object
 * @apiParam {Boolean}  items.update.isDeleted True marks report as deleted
 * @apiSuccess {Object[]} success List of successful updates
 * @apiSuccess {Object}   success._id Report mongo ObjectId
 * @apiSuccess {Object[]} fail List of updates that were rejected
 * @apiSuccess {ObjectId} fail._id Report mongo ObjectId
 * @apiSuccess {Number}   fail.status HTTP status for this action
 * @apiSuccess {Object}   fail.error  Error object (if only one error)
 * @apiSuccess {Object[]} fail.errors Errors objects (if multiple errors)
 * @apiError RequestValidationError Request did not pass validation
 * @apiError DocumentNotFoundError  Target Report not found
 * @apiError PermissionDeniedError  User has not rights to edit reports
 * @apiError AuthRequiredError
 *
 * @apiSuccessExample
 *   HTTP/1.1 200 OK
 *  {
 *     "success":[
 *       {
 *         "_id": "...",
 *         "isDeleted": true
 *       }
 *     ],
 *     "fail":[
 *       {
 *         "_id": "..."
 *         "isDeleted":[true, false]
 *         "status": 400,
 *         "error":{
 *           "code": "RequestValidation",
 *           "message": "Conflicting updates",
 *           "param": "reports",
 *           "location": "body"
 *         }
 *       }
 *     ]
 *   }
 */
router.patch('/api/report',
  apiAuthRequired,
  checkSchema({
    reports: {
      isArray: true,
      in: 'body',
      custom: {
        options: (arr) => arr.length > 0,
        errorMessage: 'Array is empty',
      },
      errorMessage: 'Array is missing or not an array',
    },
    'reports.*._id': {
      isMongoId: true,
      in: 'body',
      errorMessage: 'report._id is not a valid Mongo ObjectId',
    },
    'reports.*.isDeleted': {
      isBoolean: true,
      toBoolean: true,
      optional: true,
      in: 'body',
      errorMessage: 'report.isDeleted must be a boolean',
    },
    // 'reports.*.reason': {
    //   optional: true,
    //   trim: true,
    //   in: 'body',
    // }
  }),
  validateRequest,
  filterMatched,
  populateDocumentsByIds(Report, 'reports'),
  removeDuplicates('reports', [
    'isDeleted',
    // 'reason',
  ]),
  compareRequestWithDocuments('reports'),
  applyAndValidateDocuments('reports'),
  findUserRoles,
  async (req, res, next) => {
    try {
      res.locals.success = res.locals.success || [];
      res.locals.fail = res.locals.fail || [];
      const documents = res.locals.documents;
      const user = req.user;
      const roles = req.userRoles;


      const checkReport = (reportDocument, updateObj) => {
        const relevantRoles = [];
        if (user && user.authority === 'admin') {
          relevantRoles.push(Role.getSpecialRole('admin'));
        }
        if (roles && roles[reportDocument.boardUri]) {
          relevantRoles.push(roles[reportDocument.boardUri]);
        }
        const permissionName = 'reportPermissions';
        const checkedUpdates = _.mapValues(updateObj, (value, field) => {
          const {roleName, priority} = Role.getMaxWritePriority(relevantRoles, permissionName, field, value);
          const oldPriority = _.get(reportDocument, ['changes', field], 0);
          try {
            Role.checkPriorities(priority, oldPriority);
          } catch (err) {
            return {
              _id: reportDocument._id,
              status: 403,
              update: { [field]: value },
              roleName: roleName,
              userPriority: priority,
              currentPriority: oldPriority,
              error: err.toObject(),
            };
          }
          return { value, priority, roleName };
        });
        const update = _.pickBy(checkedUpdates, (u) => !_.has(u, 'error'));
        const denied = _.pickBy(checkedUpdates, (u) => _.has(u, 'error'));
        return {
          target: _.pick(reportDocument._id),
          granted: update,
          denied: denied,
        };
      };

      const updateReportQuery = [];
      for (const item of req.body.reports) {
        const reportDocument = documents[item._id];
        const updateObj = _.omit(item, '_id');
        const { granted, denied } = checkReport(reportDocument, updateObj);
        if (!_.isEmpty(denied)) {
          res.locals.fail.push(..._.values(denied));
        }
        if (!_.isEmpty(granted)) {
          const updateValues = _.mapValues(granted, 'value');
          const updatePriorities = _.mapValues(granted, 'priority');
          updateReportQuery.push({
            updateOne: {
              filter: { _id: item._id },
              update: {
                ...updateValues,
                changes: updatePriorities,
              }
            }
          });
          res.locals.success.push({
            _id: item._id,
            ...updateValues,
          });
        }
      }

      const { success, fail } = res.locals;
      if (!success.length) {
        const status = _.map(fail, 'status')[0];
        return res.status(status).json({fail});
      }

      await Report.bulkWrite(updateReportQuery);

      return res
        .status(200)
        .json({ success, fail });
    } catch (err) {
      next(err);
    }
  });


/**
 * @api {delete} /api/report Delete report
 * @apiName DeleteReport
 * @apiGroup Report
 * @apiPermission Role.reportActions.canDeleteReports
 * @apiDescription Delete report documents from database (permanently)
 * @apiParam {Object[]} reports Array of reports
 * @apiParam {String}   reports._id Report mongo ObjectId
 * @apiSuccess {Object[]} success List of successful updates
 * @apiSuccess {Object}  success._id Report mongo ObjectId
 * @apiSuccess {Object[]} fail List of updates that were rejected
 * @apiSuccess {Object}  fail.target Original target object that was in
 *    request
 * @apiSuccess {Number}   fail.status HTTP status for this action
 * @apiSuccess {Object}   fail.error  Error object (if only one error)
 * @apiSuccess {Object[]} fail.errors Errors objects (if multiple errors)
 * @apiError RequestValidationError Request did not pass validation
 * @apiError DocumentNotFoundError  Target Report not found
 * @apiError PermissionDeniedError  User has not rights to delete reports
 * @apiError AuthRequiredError      User is not authenticated
 */
router.delete('/api/report',
  apiAuthRequired,
  checkSchema({
    reports: {
      in: 'body',
      isArray: true,
      custom: {
        options: (arr) => arr.length > 0,
        errorMessage: 'Array is empty',
      },
      errorMessage: 'Array is missing or not an array',
    },
    'reports.*._id': {
      in: 'body',
      isMongoId: true,
      errorMessage: 'item.target._id is not a valid Mongo ObjectId',
    }
  }),
  validateRequest,
  filterMatched,
  populateDocumentsByIds(Report, 'reports', ''),
  findUserRoles,
  async (req, res, next) => {
    try {
      res.locals.success = res.locals.success || [];
      res.locals.fail = res.locals.fail || [];
      const documents = res.locals.documents;
      const user = req.user;
      const roles = req.userRoles;

      const ids = [];
      for (const item of req.body.reports) {
        const reportDocument = documents[item._id];
        const relevantRoles = [];
        if (user && user.authority === 'admin') {
          relevantRoles.push(Role.getSpecialRole('admin'));
        }
        if (roles && roles[reportDocument.boardUri]) {
          relevantRoles.push(roles[reportDocument.boardUri]);
        }
        const canDeleteReports = _.some(relevantRoles, r => _.get(r, 'reportActions.canDeleteReports', false));
        if (!canDeleteReports) {
          const err = new PermissionDeniedError();
          res.locals.fail.push({
              _id: reportDocument._id,
              status: 403,
              error: err.toObject(),
            });
        } else {
          ids.push(reportDocument._id);
          res.locals.success.push({
            _id: reportDocument._id,
          });
        }
      }

      if (!res.locals.success.length) {
        return res
          .status(403)
          .json({
            fail: res.locals.fail,
          });
      }

      await Report.deleteMany({ _id: { $in: ids }});

      return res
        .status(200)
        .json({
          success: res.locals.success,
          fail: res.locals.fail,
        });
    } catch (err) {
      next(err);
    }
  });


module.exports = router;
