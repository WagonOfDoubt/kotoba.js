const express = require('express');
const router = express.Router();
const { body, } = require('express-validator');
const _ = require('lodash');

const Role = require('../../models/role');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');
const { DocumentAlreadyExistsError } = require('../../errors');
const { ConflictError } = require('../../errors/base-error');


router.get('/api/role/',
  adminOnly,
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
    adminOnly,
    validateRequest
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
    adminOnly,
    validateRequest
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
    adminOnly,
    body('roleName')
      .exists()
      .withMessage('roleName is required')
      .isAlphanumeric(),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      const allRoles = await Role.findAllAndSort();
      const roleName = req.body.roleName;
      const currentRole = allRoles.find((r) => r.roleName === roleName);
      if (!currentRole) {
        const e = new DocumentAlreadyExistsError('Role', 'roleName', roleName, 'body');
        return e.respond(res);
      }
      if (currentRole.usedTimes > 0) {
        const e = new ConflictError(`This role is currently assigned ${currentRole.usedTimes} times. Revoke role from all users before deleting it.`, 'roleName', roleName, 'body');
        return e.respond(res);
      }
      const response = await Role.findOneAndDelete({ roleName: roleName });
      res.json(response);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
