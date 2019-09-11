const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');
const _ = require('lodash');
const fp = require('lodash/fp');

const { adminOnly } = require('../../middlewares/permission');
const { validateRequest, filterMatched } = require('../../middlewares/validation');
const { filterPostTargetItems,
  populatePostUpdateItems } = require('../../middlewares/post');
const Report = require('../../models/report');
const { populateDocumentsByIds,
  removeDuplicates,
  compareRequestWithDocuments,
  applyAndValidateDocuments } = require('../../middlewares/restapi');


/**
 * @api {get} /api/report Get reports
 * @apiName GetReport
 * @apiGroup Report
 * @apiPermission admin
 * @apiDescription Not implemented
 */
router.get('/api/report',
  adminOnly,
  validateRequest,
  async (req, res, next) => {
    try {
      return res.status(501);
    } catch (err) {
      next(err);
    }
  });


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

      const reportData = {
        ip: ip,
        useragent: useragent,
        reason: reason,
        reflinks: reflinks,
      };

      const newReport = new Report(reportData);
      await newReport.save();

      res
        .status(200)
        .json({
          success: reflinks.map(r => ({ref: r}))
        });
    } catch (err) {
      next(err);
    }
  });


/**
 * @api {patch} /api/report Modify report
 * @apiName ModifyReport
 * @apiGroup Report
 * @apiPermission admin
 * @apiParam {Object[]} items Array of reports and updates
 * @apiParam {Object}   target Reference to specific report
 * @apiParam {ObjectId} target._id Report mongo ObjectId
 * @apiParam {Object}   update Update object
 * @apiParam {Boolean}  update.isDeleted True marks report as deleted
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
  adminOnly,
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
    'reports.*.reason': {
      optional: true,
      trim: true,
      in: 'body',
    }
  }),
  validateRequest,
  filterMatched,
  populateDocumentsByIds(Report, 'reports'),
  removeDuplicates('reports', ['isDeleted', 'reason']),
  compareRequestWithDocuments('reports'),
  applyAndValidateDocuments('reports'),
  async (req, res, next) => {
    try {
      const items = req.body.reports;
      const updateReportQuery = _.map(items, item =>
        ({
          updateOne: {
            filter: _.pick(item, '_id'),
            update: _.omit(item, '_id'),
          },
        }));
      await Report.bulkWrite(updateReportQuery);

      res.locals.success = items;
      const { success, fail } = res.locals;
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
 * @apiPermission admin
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
  adminOnly,
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
  async (req, res, next) => {
    try {
      const reports = req.body.reports;

      const ids = _.map(reports, '_id');
      await Report.deleteMany({ _id: { $in: ids }});
      res.locals.success = _.map(reports, fp.pick(['_id']));
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
