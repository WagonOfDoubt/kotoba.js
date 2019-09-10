const express = require('express');
const router = express.Router();
const { checkSchema, matchedData } = require('express-validator');

const Role = require('../../models/role');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest } = require('../../middlewares/validation');
const { DocumentAlreadyExistsError, DocumentNotFoundError, ConflictError } = require('../../errors');


/**
 * @apiDefine Role_roleName
 * @apiParam {String} roleName Unique name of role by which acts as role ID.
 *    Must contain only lowercase Latin letters or digits [a-z0-9]. Maximum
 *    length is 20 characters.
 */
const roleNameValidator = {
  roleName: {
    in: 'body',
    matches: {
      options: [/^[a-z0-9]+$/],
      errorMessage: 'Role name must contain only lowercase Latin letters or digits [a-z0-9]',
    },
    isLength: {
      options: { min: 1, max: 20 },
      errorMessage: 'Role is empty or too long (more than 20 characters)',
    },
  }
};

/**
 * @apiDefine Role_hierarchy
 * @apiParam {Number} hierarchy Base priority for all user actions. Must be in
 *    range [0-9999].
 */
const roleHierarchyValidator = {
  hierarchy: {
    isInt: {
      options: { min: 0, max: 9999 },
      errorMessage: 'Role hierarchy must be in rage [0-9999]',
    },
    toInt: true,
  },
};


const _accessValidator = {
  isIn: {
    options: [['no-access', 'read-only', 'write-any', 'write-value']],
    errorMessage: 'Access type must be one of: "no-access", "read-only", "write-any", "write-value"',
  },
  optional: true,
};


const _priorityValidator = {
  isInt: {
    options: { min: 0, max: 9999 },
    errorMessage: 'Priority must be in rage [0-9999]',
  },
  toInt: true,
  optional: true,
};


const _valuesValidator = {
  eq: {
    optional: true,
  },
  min: {
    isInt: true,
    toInt: true,
    optional: true,
  },
  max: {
    isInt: true,
    toInt: true,
    optional: true,
  },
  regexp: {
    optional: true,
  },
};


/**
 * @apiDefine Role_permissions
 * @apiParam {Object} postPermissions Permissions for editing post fields
 * @apiParam {Object} postPermissions.isSticky [OP only] Make thread sticky
 * @apiParam {Number} postPermissions.isSticky.priority [0-9999]
 * @apiParam {String} postPermissions.isSticky.access One of: "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object[]} postPermissions.isSticky.values Conditions for "write-value" access
 * @apiParam {Number} postPermissions.isSticky.values.priority Priority for this condition
 * @apiParam {Mixed} postPermissions.isSticky.values.eq Equals condition
 * @apiParam {Number} postPermissions.isSticky.values.min Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isSticky.values.max Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isSticky.values.regexp Condition applied if string matches expression
 * @apiParam {Object} postPermissions.isClosed [OP only] Close thread
 * @apiParam {Number} postPermissions.isClosed.priority [0-9999]
 * @apiParam {String} postPermissions.isClosed.access One of: "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object[]} postPermissions.isClosed.values Conditions for "write-value" access
 * @apiParam {Number} postPermissions.isClosed.values.priority Priority for this condition
 * @apiParam {Mixed} postPermissions.isClosed.values.eq Equals condition
 * @apiParam {Number} postPermissions.isClosed.values.min Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isClosed.values.max Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isClosed.values.regexp Condition applied if string matches expression
 * @apiParam {Object} postPermissions.isSage Set post sage
 * @apiParam {Number} postPermissions.isSage.priority [0-9999]
 * @apiParam {String} postPermissions.isSage.access One of: "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object[]} postPermissions.isSage.values Conditions for "write-value" access
 * @apiParam {Number} postPermissions.isSage.values.priority Priority for this condition
 * @apiParam {Mixed} postPermissions.isSage.values.eq Equals condition
 * @apiParam {Number} postPermissions.isSage.values.min Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isSage.values.max Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isSage.values.regexp Condition applied if string matches expression
 * @apiParam {Object} postPermissions.isApproved Set "isApproved" flag
 * @apiParam {Number} postPermissions.isApproved.priority [0-9999]
 * @apiParam {String} postPermissions.isApproved.access One of: "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object[]} postPermissions.isApproved.values Conditions for "write-value" access
 * @apiParam {Number} postPermissions.isApproved.values.priority Priority for this condition
 * @apiParam {Mixed} postPermissions.isApproved.values.eq Equals condition
 * @apiParam {Number} postPermissions.isApproved.values.min Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isApproved.values.max Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isApproved.values.regexp Condition applied if string matches expression
 * @apiParam {Object} postPermissions.isDeleted Mark post or thread as deleted
 * @apiParam {Number} postPermissions.isDeleted.priority [0-9999]
 * @apiParam {String} postPermissions.isDeleted.access One of: "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object[]} postPermissions.isDeleted.values Conditions for "write-value" access
 * @apiParam {Number} postPermissions.isDeleted.values.priority Priority for this condition
 * @apiParam {Mixed} postPermissions.isDeleted.values.eq Equals condition
 * @apiParam {Number} postPermissions.isDeleted.values.min Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isDeleted.values.max Condition applied to range of numbers
 * @apiParam {Number} postPermissions.isDeleted.values.regexp Condition applied if string matches expression
 * @apiParam {Object} attachmentPermissions Permissions for editing attachment fields
 * @apiParam {Object} attachmentPermissions.isDeleted Mark attachment as deleted
 * @apiParam {Number} attachmentPermissions.isDeleted.priority [0-9999]
 * @apiParam {String} attachmentPermissions.isDeleted.access One of: "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object[]} attachmentPermissions.isDeleted.values Conditions for "write-value" access
 * @apiParam {Number} attachmentPermissions.isDeleted.values.priority Priority for this condition
 * @apiParam {Mixed} attachmentPermissions.isDeleted.values.eq Equals condition
 * @apiParam {Number} attachmentPermissions.isDeleted.values.min Condition applied to range of numbers
 * @apiParam {Number} attachmentPermissions.isDeleted.values.max Condition applied to range of numbers
 * @apiParam {Number} attachmentPermissions.isDeleted.values.regexp Condition applied if string matches expression
 * @apiParam {Object} attachmentPermissions.isNSFW Mark attachment as NSFW
 * @apiParam {Number} attachmentPermissions.isNSFW.priority [0-9999]
 * @apiParam {String} attachmentPermissions.isNSFW.access One of: "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object[]} attachmentPermissions.isNSFW.values Conditions for "write-value" access
 * @apiParam {Number} attachmentPermissions.isNSFW.values.priority Priority for this condition
 * @apiParam {Mixed} attachmentPermissions.isNSFW.values.eq Equals condition
 * @apiParam {Number} attachmentPermissions.isNSFW.values.min Condition applied to range of numbers
 * @apiParam {Number} attachmentPermissions.isNSFW.values.max Condition applied to range of numbers
 * @apiParam {Number} attachmentPermissions.isNSFW.values.regexp Condition applied if string matches expression
 * @apiParam {Object} attachmentPermissions.isSpoiler Mark attachment as spoiler
 * @apiParam {Number} attachmentPermissions.isSpoiler.priority [0-9999]
 * @apiParam {String} attachmentPermissions.isSpoiler.access One of: "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object[]} attachmentPermissions.isSpoiler.values Conditions for "write-value" access
 * @apiParam {Number} attachmentPermissions.isSpoiler.values.priority Priority for this condition
 * @apiParam {Mixed} attachmentPermissions.isSpoiler.values.eq Equals condition
 * @apiParam {Number} attachmentPermissions.isSpoiler.values.min Condition applied to range of numbers
 * @apiParam {Number} attachmentPermissions.isSpoiler.values.max Condition applied to range of numbers
 * @apiParam {Number} attachmentPermissions.isSpoiler.values.regexp Condition applied if string matches expression
 * @type {Object}
 */
const rolePermissionsValidator = {
  'postPermissions.isSticky.priority': _priorityValidator,
  'postPermissions.isSticky.access': _accessValidator,
  'postPermissions.isSticky.values.*.priority': _priorityValidator,
  'postPermissions.isSticky.values.*.min': _valuesValidator.min,
  'postPermissions.isSticky.values.*.max': _valuesValidator.max,
  'postPermissions.isSticky.values.*.eq': _valuesValidator.eq,
  'postPermissions.isSticky.values.*.regexp': _valuesValidator.regexp,
  'postPermissions.isClosed.priority': _priorityValidator,
  'postPermissions.isClosed.access': _accessValidator,
  'postPermissions.isClosed.values.*.priority': _priorityValidator,
  'postPermissions.isClosed.values.*.min': _valuesValidator.min,
  'postPermissions.isClosed.values.*.max': _valuesValidator.max,
  'postPermissions.isClosed.values.*.eq': _valuesValidator.eq,
  'postPermissions.isClosed.values.*.regexp': _valuesValidator.regexp,
  'postPermissions.isSage.priority': _priorityValidator,
  'postPermissions.isSage.access': _accessValidator,
  'postPermissions.isSage.values.*.priority': _priorityValidator,
  'postPermissions.isSage.values.*.min': _valuesValidator.min,
  'postPermissions.isSage.values.*.max': _valuesValidator.max,
  'postPermissions.isSage.values.*.eq': _valuesValidator.eq,
  'postPermissions.isSage.values.*.regexp': _valuesValidator.regexp,
  'postPermissions.isApproved.priority': _priorityValidator,
  'postPermissions.isApproved.access': _accessValidator,
  'postPermissions.isApproved.values.*.priority': _priorityValidator,
  'postPermissions.isApproved.values.*.min': _valuesValidator.min,
  'postPermissions.isApproved.values.*.max': _valuesValidator.max,
  'postPermissions.isApproved.values.*.eq': _valuesValidator.eq,
  'postPermissions.isApproved.values.*.regexp': _valuesValidator.regexp,
  'postPermissions.isDeleted.priority': _priorityValidator,
  'postPermissions.isDeleted.access': _accessValidator,
  'postPermissions.isDeleted.values.*.priority': _priorityValidator,
  'postPermissions.isDeleted.values.*.min': _valuesValidator.min,
  'postPermissions.isDeleted.values.*.max': _valuesValidator.max,
  'postPermissions.isDeleted.values.*.eq': _valuesValidator.eq,
  'postPermissions.isDeleted.values.*.regexp': _valuesValidator.regexp,
  'attachmentPermissions.isDeleted.priority': _priorityValidator,
  'attachmentPermissions.isDeleted.access': _accessValidator,
  'attachmentPermissions.isDeleted.values.*.priority': _priorityValidator,
  'attachmentPermissions.isDeleted.values.*.min': _valuesValidator.min,
  'attachmentPermissions.isDeleted.values.*.max': _valuesValidator.max,
  'attachmentPermissions.isDeleted.values.*.eq': _valuesValidator.eq,
  'attachmentPermissions.isDeleted.values.*.regexp': _valuesValidator.regexp,
  'attachmentPermissions.isNSFW.priority': _priorityValidator,
  'attachmentPermissions.isNSFW.access': _accessValidator,
  'attachmentPermissions.isNSFW.values.*.priority': _priorityValidator,
  'attachmentPermissions.isNSFW.values.*.min': _valuesValidator.min,
  'attachmentPermissions.isNSFW.values.*.max': _valuesValidator.max,
  'attachmentPermissions.isNSFW.values.*.eq': _valuesValidator.eq,
  'attachmentPermissions.isNSFW.values.*.regexp': _valuesValidator.regexp,
  'attachmentPermissions.isSpoiler.priority': _priorityValidator,
  'attachmentPermissions.isSpoiler.access': _accessValidator,
  'attachmentPermissions.isSpoiler.values.*.priority': _priorityValidator,
  'attachmentPermissions.isSpoiler.values.*.min': _valuesValidator.min,
  'attachmentPermissions.isSpoiler.values.*.max': _valuesValidator.max,
  'attachmentPermissions.isSpoiler.values.*.eq': _valuesValidator.eq,
  'attachmentPermissions.isSpoiler.values.*.regexp': _valuesValidator.regexp,
};


/**
 * @api {get} /api/role Get roles
 * @apiName GetRole
 * @apiGroup Role
 * @apiPermission admin
 * @apiDescription Not implemented
 */
router.get(
  '/api/role/',
  adminOnly,
  validateRequest,
  async (req, res, next) => {
    try {
      return res.status(501);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {post} /api/role Create role
 * @apiName CreateRole
 * @apiGroup Role
 * @apiPermission admin
 * @apiDescription Create new role that can be assigned to staff members.
 * @apiUse Role_roleName
 * @apiUse Role_hierarchy
 * @apiUse Role_permissions
 * @apiUse DocumentAlreadyExistsError
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiSuccessExample
 *     HTTP/1.1 201 Created
 *     {
 *       "roleName": "...",
 *       "hierarchy": 9999,
 *       "postPermissions": {...},
 *       "attachmentPermissions": {...}
 *     }
 */
router.post(
  '/api/role/',
  adminOnly,
  checkSchema({
    ...roleNameValidator,
    ...roleHierarchyValidator,
    ...rolePermissionsValidator,
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const matched = matchedData(req);
      const roleName = matched.roleName;
      const existingRole = await Role.findOne({ roleName });
      if (existingRole) {
        const e = new DocumentAlreadyExistsError('Role', 'roleName', roleName, 'body');
        return e.respond(res);
      }
      const savedRole = await Role.create(matched);
      return res
        .status(201)
        .json(savedRole);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * @api {patch} /api/role Modify role
 * @apiName ModifyRole
 * @apiGroup Role
 * @apiPermission admin
 * @apiDescription Modify role
 * @apiUse Role_roleName
 * @apiUse Role_hierarchy
 * @apiUse Role_permissions
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiSuccessExample
 *     HTTP/1.1 200 OK
 *     {
 *       "roleName": "...",
 *       "hierarchy": 9999,
 *       "postPermissions": {...},
 *       "attachmentPermissions": {...}
 *     }
 */
router.patch(
  '/api/role/',
  adminOnly,
  checkSchema({
    ...roleNameValidator,
    ...roleHierarchyValidator,
    ...rolePermissionsValidator,
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const matched = matchedData(req);
      const roleName = matched.roleName;
      const existingRole = await Role.findOne({ roleName });
      if (!existingRole) {
        const e = new DocumentNotFoundError('Role', 'roleName', roleName, 'body');
        return e.respond(res);
      }
      existingRole.set(matched);
      const mongoResult = await existingRole.save();
      return res
        .status(200)
        .json(mongoResult);
    } catch (err) {
      return next(err);
    }
  }
);


/**
 * @api {delete} /api/role Delete role
 * @apiName DeleteRole
 * @apiGroup Role
 * @apiPermission admin
 * @apiDescription Only roles that are not assigned to any user can be deleted.
 * @apiUse Role_roleName
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 * @apiUse AuthRequiredError
 * @apiUse PermissionDeniedError
 * @apiUse ConflictError
 * @apiSuccessExample
 *     HTTP/1.1 200 OK
 *     {
 *       "roleName": "...",
 *       "hierarchy": 9999,
 *       "postPermissions": {...},
 *       "attachmentPermissions": {...}
 *     }
 */
router.delete('/api/role/',
  adminOnly,
  checkSchema({
    ...roleNameValidator,
  }),
  validateRequest,
  async (req, res, next) => {
    try {
      const matched = matchedData(req);
      const roleName = matched.roleName;
      const allRoles = await Role.findAllAndSort();
      const currentRole = allRoles.find((r) => r.roleName === roleName);
      if (!currentRole) {
        const e = new DocumentNotFoundError('Role', 'roleName', roleName, 'body');
        return e.respond(res);
      }
      if (currentRole.usedTimes > 0) {
        const e = new ConflictError(`This role is currently assigned ${currentRole.usedTimes} times. Revoke role from all users before deleting it.`, 'roleName', roleName, 'body');
        return e.respond(res);
      }
      const mongoResult = await Role.findOneAndDelete({ roleName: roleName });
      return res
        .status(200)
        .json(mongoResult);
    } catch (err) {
      return next(err);
    }
  }
);


module.exports = router;
