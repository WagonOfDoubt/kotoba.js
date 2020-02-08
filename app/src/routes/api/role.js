const express = require('express');
const router = express.Router();
const { checkSchema } = require('express-validator');

const Role = require('../../models/role');
const { adminOnly } = require('../../middlewares/permission');
const { validateRequest, filterMatched } = require('../../middlewares/validation');
const { DocumentAlreadyExistsError, DocumentNotFoundError, ConflictError } = require('../../errors');
const { restGetQuerySchema } = require('../../middlewares/reqparser');
const { createGetRequestHandler } = require('../../middlewares/restapi');


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


const roleDisplayNameValidator = {
  displayName: {
    in: 'body',
    optional: true,
  }
};


/**
 * @apiDefine Role_hierarchy
 * @apiParam {Number} hierarchy Base priority for all user actions. Must be in
 *    range [0-9999].
 */
const roleHierarchyValidator = {
  hierarchy: {
    in: 'body',
    isInt: {
      options: { min: 0, max: 9999 },
      errorMessage: 'Role hierarchy must be in rage [0-9999]',
    },
    toInt: true,
  },
};


const _accessValidator = {
  in: 'body',
  isIn: {
    options: [['no-access', 'read-only', 'write-any', 'write-value']],
    errorMessage: 'Access type must be one of: "no-access", "read-only", "write-any", "write-value"',
  },
  optional: true,
};


const _priorityValidator = {
  in: 'body',
  isInt: {
    options: { min: 0, max: 9999 },
    errorMessage: 'Priority must be in rage [0-9999]',
  },
  toInt: true,
  optional: true,
};


const _valuesValidator = {
  in: 'body',
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


const _privilegeValidator = {
  in: 'body',
  isBoolean: true,
  toBoolean: true,
};


/**
 * @apiDefine Role_permissions
 * @apiParam {Object} postPermissions Permissions for editing post fields
 * @apiParam {Object} postPermissions.isSticky [OP only] Make thread sticky
 * @apiParam {Number} postPermissions.isSticky.priority [0-9999]
 * @apiParam {String} postPermissions.isSticky.access One of: `no-access`,
 *    `read-only`, `write-any`, `write-value`
 * @apiParam {Object} postPermissions.isClosed [OP only] Close thread
 * @apiParam {Number} postPermissions.isClosed.priority [0-9999]
 * @apiParam {String} postPermissions.isClosed.access One of: `no-access`,
 *    `read-only`, `write-any`, `write-value`
 * @apiParam {Object} postPermissions.isSage Set post sage
 * @apiParam {Number} postPermissions.isSage.priority [0-9999]
 * @apiParam {String} postPermissions.isSage.access One of: `no-access`,
 *    `read-only`, `write-any`, `write-value`
 * @apiParam {Object} postPermissions.isApproved Set "isApproved" flag
 * @apiParam {Number} postPermissions.isApproved.priority [0-9999]
 * @apiParam {String} postPermissions.isApproved.access One of: `no-access`,
 *    `read-only`, `write-any`, `write-value`
 * @apiParam {Object} postPermissions.isDeleted Mark post or thread as deleted
 * @apiParam {Number} postPermissions.isDeleted.priority [0-9999]
 * @apiParam {String} postPermissions.isDeleted.access One of: `no-access`,
 *    `read-only`, `write-any`, `write-value`
 * @apiParam {Object} attachmentPermissions Permissions for editing attachment
 *    fields
 * @apiParam {Object} attachmentPermissions.isDeleted Mark attachment as
 *    deleted
 * @apiParam {Number} attachmentPermissions.isDeleted.priority [0-9999]
 * @apiParam {String} attachmentPermissions.isDeleted.access One of:
 *    "no-access", "read-only", "write-any", "write-value"
 * @apiParam {Object} attachmentPermissions.isNSFW Mark attachment as NSFW
 * @apiParam {Number} attachmentPermissions.isNSFW.priority [0-9999]
 * @apiParam {String} attachmentPermissions.isNSFW.access One of: `no-access`,
 *    `read-only`, `write-any`, `write-value`
 * @apiParam {Object} attachmentPermissions.isSpoiler Mark attachment as
 *    spoiler
 * @apiParam {Number} attachmentPermissions.isSpoiler.priority [0-9999]
 * @apiParam {String} attachmentPermissions.isSpoiler.access One of:
 *    "no-access", "read-only", "write-any", "write-value"
 * @property {Boolean} postingPrivileges.ignoreCaptcha User is not required to
 *    solve captcha
 * @property {Boolean} postingPrivileges.ignoreClosed  User can post in closed
 *    threads or boards
 * @property {Boolean} postingPrivileges.ignoreForcedAnon User can enter name
 *    regardless of board options
 * @property {Boolean} postingPrivileges.canUseMarkdown User can post with
 *    markdown markup instead of default markup
 * @property {Boolean} reportActions.canViewReports User can view reports on
 *    board
 * @property {Boolean} reportActions.canDeleteReports User can permanently
 *    delete reports on board
 * @apiParam {Object} reportPermissions.isDeleted Mark report as deleted
 * @apiParam {Number} reportPermissions.isDeleted.priority [0-9999]
 * @apiParam {String} reportPermissions.isDeleted.access One of: `no-access`,
 *    `read-only`, `write-any`, `write-value`
 * @type {Object}
 */
const rolePermissionsValidator = {
  'postPermissions.isSticky.priority': _priorityValidator,
  'postPermissions.isSticky.access': _accessValidator,
  'postPermissions.isSticky.values.*.priority': _priorityValidator,
  'postPermissions.isSticky.values.*.eq': _valuesValidator.eq,

  'postPermissions.isClosed.priority': _priorityValidator,
  'postPermissions.isClosed.access': _accessValidator,
  'postPermissions.isClosed.values.*.priority': _priorityValidator,
  'postPermissions.isClosed.values.*.eq': _valuesValidator.eq,

  'postPermissions.isSage.priority': _priorityValidator,
  'postPermissions.isSage.access': _accessValidator,
  'postPermissions.isSage.values.*.priority': _priorityValidator,
  'postPermissions.isSage.values.*.eq': _valuesValidator.eq,

  'postPermissions.isApproved.priority': _priorityValidator,
  'postPermissions.isApproved.access': _accessValidator,
  'postPermissions.isApproved.values.*.priority': _priorityValidator,
  'postPermissions.isApproved.values.*.eq': _valuesValidator.eq,

  'postPermissions.isDeleted.priority': _priorityValidator,
  'postPermissions.isDeleted.access': _accessValidator,
  'postPermissions.isDeleted.values.*.priority': _priorityValidator,
  'postPermissions.isDeleted.values.*.eq': _valuesValidator.eq,

  'attachmentPermissions.isDeleted.priority': _priorityValidator,
  'attachmentPermissions.isDeleted.access': _accessValidator,
  'attachmentPermissions.isDeleted.values.*.priority': _priorityValidator,
  'attachmentPermissions.isDeleted.values.*.eq': _valuesValidator.eq,

  'attachmentPermissions.isNSFW.priority': _priorityValidator,
  'attachmentPermissions.isNSFW.access': _accessValidator,
  'attachmentPermissions.isNSFW.values.*.priority': _priorityValidator,
  'attachmentPermissions.isNSFW.values.*.eq': _valuesValidator.eq,

  'attachmentPermissions.isSpoiler.priority': _priorityValidator,
  'attachmentPermissions.isSpoiler.access': _accessValidator,
  'attachmentPermissions.isSpoiler.values.*.priority': _priorityValidator,
  'attachmentPermissions.isSpoiler.values.*.eq': _valuesValidator.eq,

  'postingPrivileges.ignoreCaptcha': _privilegeValidator,
  'postingPrivileges.ignoreClosed': _privilegeValidator,
  'postingPrivileges.ignoreForcedAnon': _privilegeValidator,
  'postingPrivileges.canUseMarkdown': _privilegeValidator,
  'postingPrivileges.canFakeTimestamp': _privilegeValidator,

  'reportActions.canViewReports': _privilegeValidator,
  'reportActions.canDeleteReports': _privilegeValidator,

  'reportPermissions.isDeleted.priority': _priorityValidator,
  'reportPermissions.isDeleted.access': _accessValidator,
  'reportPermissions.isDeleted.values.*.priority': _priorityValidator,
  'reportPermissions.isDeleted.values.*.eq': _valuesValidator.eq,
};


/**
 * @api {get} /api/style/ Get Roles
 * @apiName GetRole
 * @apiGroup Role
 * @apiPermission admin
 * @apiDescription Find one or more role based on query.
 * Search is ignored.
 *
 * Filter can be applied by: `roleName`, `displayName`, `hierarchy`.
 *
 * Selectable fields are: `roleName`, `displayName`, `hierarchy`,
 *    `postPermissions`, `attachmentPermissions`, `postingPrivileges`,
 *    `reportActions`, `reportPermissions`.
 * @apiUse GenericGetApi
 * @apiUse DocumentNotFoundError
 * @apiUse RequestValidationError
 */
router.get(
  '/api/role/',
  adminOnly,
  checkSchema(restGetQuerySchema),
  validateRequest,
  filterMatched,
  createGetRequestHandler('Role', false),
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
    ...roleDisplayNameValidator,
    ...roleHierarchyValidator,
    ...rolePermissionsValidator,
  }),
  validateRequest,
  filterMatched,
  async (req, res, next) => {
    try {
      const roleName = req.body.roleName;
      const existingRole = await Role.findOne({ roleName });
      if (existingRole) {
        const e = new DocumentAlreadyExistsError('Role', 'roleName', roleName, 'body');
        return e.respond(res);
      }
      const savedRole = await Role.create(req.body);
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
    ...roleDisplayNameValidator,
    ...roleHierarchyValidator,
    ...rolePermissionsValidator,
  }),
  validateRequest,
  filterMatched,
  async (req, res, next) => {
    try {
      const roleName = req.body.roleName;
      const existingRole = await Role.findOne({ roleName });
      if (!existingRole) {
        const e = new DocumentNotFoundError('Role', 'roleName', roleName, 'body');
        return e.respond(res);
      }
      existingRole.set(req.body);
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
  filterMatched,
  async (req, res, next) => {
    try {
      const roleName = req.body.roleName;
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
