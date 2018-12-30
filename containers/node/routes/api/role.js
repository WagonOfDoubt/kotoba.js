const express = require('express');
const router = express.Router();
const { check, oneOf, body, param, validationResult } = require('express-validator/check');
const { matchedData, sanitize, sanitizeBody } = require('express-validator/filter');
const _ = require('lodash');

const Role = require('../../models/role');
const middlewares = require('../../utils/middlewares');


router.get('/api/role/',
  middlewares.adminOnly,
  async (req, res, next) => {
    try {
      const roles = await Role.findAllAndSort();
      res.json(roles);
    } catch (err) {
      return next(err);
    }
  }
);


router.put(
  '/api/role/',
  [
    body('roleName')
      .exists()
      .isAlphanumeric()
      .withMessage('Role name must contain only latin letters and numbers [a-zA-Z0-9]'),
    body('hierarchy')
      .isInt({ min: 0, max: 9999 })
      .withMessage('value must be between 0 and 9999'),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      const hierarchy = req.body.hierarchy;
      req.body = _.defaults(req.body, {
        'postPermissions.isSticky.priority': hierarchy,
        'postPermissions.isClosed.priority': hierarchy,
        'postPermissions.isSage.priority': hierarchy,
        'postPermissions.isApproved.priority': hierarchy,
        'postPermissions.isDeleted.priority': hierarchy,
        'attachmentPermissions.isDeleted.priority': hierarchy,
        'attachmentPermissions.isNSFW.priority': hierarchy,
        'attachmentPermissions.isSpoiler.priority': hierarchy,
      });
      const mongoResult = await Role.create(req.body);
      res.json(mongoResult);
    } catch (err) {
      return next(err);
    }
  }
);


router.patch(
  '/api/role/',
  [
    body('roleName')
      .exists()
      .isAlphanumeric()
      .withMessage('Role name must contain only latin letters and numbers [a-zA-Z0-9]'),
    body('hierarchy')
      .isInt({ min: 0, max: 9999 })
      .withMessage('value must be between 0 and 9999'),
    middlewares.adminOnly,
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      const hierarchy = req.body.hierarchy;
      req.body = _.defaults(req.body, {
        'postPermissions.isSticky.priority': hierarchy,
        'postPermissions.isClosed.priority': hierarchy,
        'postPermissions.isSage.priority': hierarchy,
        'postPermissions.isApproved.priority': hierarchy,
        'postPermissions.isDeleted.priority': hierarchy,
        'attachmentPermissions.isDeleted.priority': hierarchy,
        'attachmentPermissions.isNSFW.priority': hierarchy,
        'attachmentPermissions.isSpoiler.priority': hierarchy,
      });
      const updateQuery = _.pick(req.body, [
        'hierarchy',
        'roleName',
        'postPermissions',
        'postPermissions.isSticky.priority',
        'postPermissions.isSticky.access',
        'postPermissions.isClosed.priority',
        'postPermissions.isClosed.access',
        'postPermissions.isSage.priority',
        'postPermissions.isSage.access',
        'postPermissions.isApproved.priority',
        'postPermissions.isApproved.access',
        'postPermissions.isDeleted.priority',
        'postPermissions.isDeleted.access',
        'attachmentPermissions.isDeleted.priority',
        'attachmentPermissions.isDeleted.access',
        'attachmentPermissions.isNSFW.priority',
        'attachmentPermissions.isNSFW.access',
        'attachmentPermissions.isSpoiler.priority',
        'attachmentPermissions.isSpoiler.access',
      ]);
      const mongoResult = await Role.findOneAndUpdate({ roleName: req.body.roleName }, updateQuery);
      res.json(mongoResult);
    } catch (err) {
      return next(req.body);
    }
  }
);


router.delete('/api/role/',
  [
    middlewares.adminOnly,
    body('roleName')
      .exists()
      .withMessage('roleName is required')
      .isAlphanumeric(),
    middlewares.validateRequest
  ],
  async (req, res, next) => {
    try {
      const allRoles = await Role.findAllAndSort();
      const currentRole = allRoles.find((r) => r.roleName === req.body.roleName);
      if (!currentRole) {
        res.status(422).json({
          error: {
            location: 'body',
            param: 'roleName',
            value: req.body.roleName,
            msg: 'Role does not exist'
          }
        });
        return;
      }
      if (currentRole.usedTimes > 0) {
        res.status(422).json({
          error: {
            location: 'body',
            param: 'roleName',
            value: req.body.roleName,
            msg: `This role is currently assigned ${currentRole.usedTimes} times. Revoke role from all users before deleting it.`
          }
        });
        return;
      }
      const response = await Role.findOneAndDelete({ roleName: req.body.roleName });
      res.json(response);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
