/**
 * Model for moderator roles
 * @module models/role
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = mongoose.Schema.Types.Mixed;
const _ = require('lodash');
const deepFreeze = require('deep-freeze-strict');
const { createApiQueryHandler } = require('../utils/model');
const { PermissionDeniedError } = require('../errors');


/**
 * @typedef {Object} PropertyAccess
 * @property {Number} priority Priority for specific action. Actions can be
 *    undone by users who wave roles with higher priority for same action.
 * @property {String} access What user can do with property: "no-access",
 *    "read-only", "write-any", "write-value"
 * @property {Array.<PropertyAccessCondition>} values If access is
 *    "write-value", this array specifies priorities for each individual
 *    value, range or pattern
 */
const propertyAccessSchema = Schema({
  access: {
    type: String,
    enum: ['no-access', 'read-only', 'write-any', 'write-value'],
    required: true,
    default: 'no-access',
  },
},
{ discriminatorKey: 'access', _id: false });


const writeAccessSchema = Schema({
    priority: {
    type: Number,
    min: 0,
    max: 9999,
    get: v => Math.round(v),
    set: v => Math.round(v),
    required: true,
  },
}, { _id: false });


const conditinalWriteAccessSchema = Schema({
  values: [
    /**
     * @typedef {Object} PropertyAccessCondition
     * @property {Number} priority Priority when condition is met
     * @property {*} eq Equal to value condition
     * @property {Number} max Number in range condition: maximum value
     * @property {Number} min Number in range condition: minimum value
     * @property {String} regexp String matches Regular Expression condition
     */
    {
      priority: {
        type: Number,
        min: 0,
        max: 9999,
        required: true,
        get: v => Math.round(v),
        set: v => Math.round(v),
      },
      eq:     { type: Mixed },
      min:    { type: Number },
      max:    { type: Number },
      regexp: { type: String },
    }
  ],
}, { _id: false });


/**
 * Role that can be assigned to staff member
 * @class Role
 * @extends external:Model
 */
const roleSchema = Schema({
  /**
   * Name of role that also acts as unique id
   * @type {String}
   * @memberOf module:models/role~Role#
   * @instance
   * @readOnly
   */
  roleName: {
    type: String,
    required: true,
    index: true,
    unique: true,
    validate: {
      validator: (v) => /^[a-z0-9]+$/,
      message: `Role name must contain only latin letters and numbers [a-zA-Z0-9]`,
    },
    immutable: true,
  },
  /**
   * Readable role name that displayed in posts
   * @type {String}
   * @memberOf module:models/role~Role#
   * @instance
   * @readOnly
   */
  displayName: {
    type: String,
    default: '',
  },
  /**
   * Position of role in hierarchy. Serves as default priority for all
   *    actions.
   * @type {Number}
   * @memberOf module:models/role~Role#
   * @instance
   */
  hierarchy: {
    type: Number,
    min: 0,
    max: 9999,
    required: true,
    get: v => Math.round(v),
    set: v => Math.round(v),
  },
  /**
   * Access to post fields
   * @type {Object}
   * @property {module:models/role~PropertyAccess} isSticky Access to
   *    post.isSticky property
   * @property {module:models/role~PropertyAccess} isClosed Access to
   *    post.isClosed property
   * @property {module:models/role~PropertyAccess} isSage Access to
   *    post.isSage property
   * @property {module:models/role~PropertyAccess} isApproved Access to
   *    post.isApproved property
   * @property {module:models/role~PropertyAccess} isDeleted Access to
   *    post.isDeleted property
   * @memberOf module:models/role~Role
   * @instance
   */
  postPermissions: {
    isSticky   : { type: propertyAccessSchema },
    isClosed   : { type: propertyAccessSchema },
    isSage     : { type: propertyAccessSchema },
    isApproved : { type: propertyAccessSchema },
    isDeleted  : { type: propertyAccessSchema },
  },
  /**
   * Access to post fields
   * @type {Object}
   * @property {module:models/role~PropertyAccess} isDeleted Access to
   *    post.isDeleted property
   * @property {module:models/role~PropertyAccess} isNSFW Access to
   *    post.isNSFW property
   * @property {module:models/role~PropertyAccess} isSpoiler Access to
   *    post.isSpoiler property
   * @memberOf module:models/role~Role
   * @instance
   */
  attachmentPermissions: {
    isDeleted : { type: propertyAccessSchema },
    isNSFW    : { type: propertyAccessSchema },
    isSpoiler : { type: propertyAccessSchema },
  },
  /**
   * Posting privileges
   * @type {Object}
   * @property {Boolean} ignoreCaptcha User is not required to solve captcha
   * @property {Boolean} ignoreClosed  User can post in closed threads or
   *    boards
   * @property {Boolean} ignoreForcedAnon User can enter name regardless of
   *    board options
   * @property {Boolean} canUseMarkdown User can post with markdown markup
   *    instead of default markup
   */
  postingPrivileges: {
    ignoreCaptcha    : { type: Boolean, default: false },
    ignoreClosed     : { type: Boolean, default: false },
    ignoreForcedAnon : { type: Boolean, default: false },
    canUseMarkdown   : { type: Boolean, default: false },
    canFakeTimestamp : { type: Boolean, default: false },
  },
  /**
   * Actions related to reports
   * @type {Object}
   * @property {Boolean} canViewReports User can view reports on board
   * @property {Boolean} canDeleteReports User can delete reports on board
   *    (permanently)
   */
  reportActions: {
    canViewReports    : { type: Boolean, default: false },
    canDeleteReports  : { type: Boolean, default: false },
  },
  /**
   * Access to post fields
   * @type {Object}
   * @property {module:models/role~PropertyAccess} isDeleted Access to
   *    report.isDeleted property
   * @memberOf module:models/role~Role
   * @instance
   */
  reportPermissions: {
    isDeleted : { type: propertyAccessSchema },
  },
});


/**
 * Each property with access control has an individual priority but to avoid
 *    complication value of hierarchy field is used as priority for all
 *    properties
 */
roleSchema.pre('validate', function () {
  const defaultPriority = (currentValue, defaultValue) => {
    if (_.isFinite(currentValue)) {
      return currentValue;
    }
    return defaultValue;
  };

  const defaultPermission = (permissions, permissionName) => {
    this[permissions][permissionName] =
      this[permissions][permissionName] || {};
    const access = this[permissions][permissionName].access;
    if (!access || access === 'no-access' || access === 'read-only') {
      return;
    }
    this[permissions][permissionName].priority =
      defaultPriority(this[permissions][permissionName].priority, this.hierarchy);
  };

  defaultPermission('postPermissions',       'isSticky');
  defaultPermission('postPermissions',       'isClosed');
  defaultPermission('postPermissions',       'isSage');
  defaultPermission('postPermissions',       'isApproved');
  defaultPermission('postPermissions',       'isDeleted');
  defaultPermission('attachmentPermissions', 'isDeleted');
  defaultPermission('attachmentPermissions', 'isNSFW');
  defaultPermission('attachmentPermissions', 'isSpoiler');
  defaultPermission('reportPermissions',     'isDeleted');
});


roleSchema.path('postPermissions.isSticky').discriminator('write-any', writeAccessSchema);
roleSchema.path('postPermissions.isApproved').discriminator('write-any', writeAccessSchema);

roleSchema.path('postPermissions.isClosed').discriminator('write-any', writeAccessSchema);
roleSchema.path('postPermissions.isClosed').discriminator('write-value', conditinalWriteAccessSchema);
roleSchema.path('postPermissions.isSage').discriminator('write-any', writeAccessSchema);
roleSchema.path('postPermissions.isSage').discriminator('write-value', conditinalWriteAccessSchema);
roleSchema.path('postPermissions.isDeleted').discriminator('write-any', writeAccessSchema);
roleSchema.path('postPermissions.isDeleted').discriminator('write-value', conditinalWriteAccessSchema);

roleSchema.path('attachmentPermissions.isDeleted').discriminator('write-any', writeAccessSchema);
roleSchema.path('attachmentPermissions.isDeleted').discriminator('write-value', writeAccessSchema);
roleSchema.path('attachmentPermissions.isNSFW').discriminator('write-any', writeAccessSchema);
roleSchema.path('attachmentPermissions.isNSFW').discriminator('write-value', writeAccessSchema);
roleSchema.path('attachmentPermissions.isSpoiler').discriminator('write-any', writeAccessSchema);
roleSchema.path('attachmentPermissions.isSpoiler').discriminator('write-value', writeAccessSchema);

roleSchema.path('reportPermissions.isDeleted').discriminator('write-any', writeAccessSchema);


/**
 * Find all roles sorted by hierarchy
 * @memberOf module:models/role~Role
 * @alias module:models/role~Role.findAllAndSort
 * @static
 * @return {external:Query} Mongoose query
 */
roleSchema.statics.findAllAndSort = () => {
  return Role.aggregate([
    {
      $lookup: {
        from: 'users',
        pipeline: [
          {
            $project: {
              array: { $objectToArray: '$boardRoles' }
            }
          },
          { $unwind: '$array' },
          {
            $group: {
              _id: '$array.v',
              total: { $sum: 1 }
            }
          }
        ],
        as: 'usedTimes'
      }
    },
    {
      $addFields: {
        usedTimes: {
          $filter: {
            input: "$usedTimes",
            as: "item",
            cond: { $eq: ["$$item._id", "$_id"] }
          }
        }
      }
    },
    {
      $addFields: {
        usedTimes: {
          $let: {
            vars: {
              first: {
                  "$arrayElemAt": ["$usedTimes", 0]
              }
            },
            in: { $max: ["$$first.total", 0] }
          },
        }
      }
    },
    {
      $sort: { hierarchy: -1 }
    }
  ]);
};


const adminRole = deepFreeze({
  roleName: '__admin',
  displayName: 'Admin',
  hierarchy: 9999,
  postPermissions: {
    isSticky: {
      priority: 9999,
      access: 'write-any',
    },
    isClosed: {
      priority: 9999,
      access: 'write-any',
    },
    isSage: {
      priority: 9999,
      access: 'write-any',
    },
    isApproved: {
      priority: 9999,
      access: 'write-any',
    },
    isDeleted: {
      priority: 9999,
      access: 'write-any',
    },
  },
  attachmentPermissions: {
    isDeleted: {
      priority: 9999,
      access: 'write-any',
    },
    isNSFW: {
      priority: 9999,
      access: 'write-any',
    },
    isSpoiler: {
      priority: 9999,
      access: 'write-any',
    },
  },
  postingPrivileges: {
    ignoreCaptcha    : true,
    ignoreClosed     : true,
    ignoreForcedAnon : true,
    canUseMarkdown   : true,
    canFakeTimestamp : true,
  },
  reportActions: {
    canViewReports   : true,
    canDeleteReports : true,
  },
  reportPermissions: {
    isDeleted : {
      priority: 9999,
      access: 'write-any',
    },
  },
});


const posterRole = {
  roleName: '__poster',
  displayName: 'Anonymous',
  hierarchy: 0,
  postPermissions: {
    // anonymous can delete their own post, but can't restore it
    // and only admin can restore it
    isDeleted: {
      access: 'write-value',
      values: [
        { eq: true,  priority: 9999 },
      ]
    },
    // anonymous can close their own thread (but only once)
    // and any staff member with permission can un-close it
    isClosed: {
      access: 'write-value',
      values: [
        { eq: true,  priority: 1 },
      ]
    },
    // anonymous can add sage (but only once)
    // and only admin can un-sage it
    // anonymous can remove sage
    // and any staff member with permission can add sage
    isSage: {
      access: 'write-value',
      values: [
        { eq: true,  priority: 9999 },
        { eq: false, priority: 1 },
      ]
    },
  },
  attachmentPermissions: {
    // anonymous can delete attachments in their own post, but can't restore it
    // and only admin can restore it
    isDeleted: {
      access: 'write-value',
      values: [
        { eq: true,  priority: 9999 },
      ]
    },
    // anonymous can set or unset NSFW (but only once)
    // and any staff member with permission can undo it
    isNSFW: {
      access: 'write-value',
      values: [
        { eq: true,  priority: 2 },
        { eq: false, priority: 1 },
      ]
    },
    // anonymous can set or unset spoiler (but only once)
    // and any staff member with permission can undo it
    isSpoiler: {
      access: 'write-value',
      values: [
        { eq: true,  priority: 2 },
        { eq: false, priority: 1 },
      ]
    },
  },
  postingPrivileges: {
    ignoreCaptcha    : false,
    ignoreClosed     : false,
    ignoreForcedAnon : false,
    canUseMarkdown   : false,
    canFakeTimestamp : false,
  },
  reportActions: {
    canViewReports   : false,
    canDeleteReports : false,
  },
  reportPermissions: {
    isDeleted : {
      access: 'no-access',
    },
  },
};


/**
 * User has no write access
 * @type {Number}
 */
const PRIORITY_NO_ACCESS        = -1;
/**
 * User has no role assigned for this board
 * @type {Number}
 */
const PRIORITY_NO_ROLE          = -10;
/**
 * Invalid field name
 * @type {Number}
 */
const PRIORITY_INVALID_FIELD    = -20;
/**
 * User permissions for this action is undefined
 * @type {Number}
 */
const PRIORITY_EMPTY_PERMISSION = -30;
/**
 * User has no permission to set field to this value
 * @type {Number}
 */
const PRIORITY_INVALID_VALUE    = -40;
/**
 * User is not logged in and post password is incorrect
 * @type {Number}
 */
const PRIORITY_NO_PASSWORD      = -50;


/**
 * Check if new priority allows to change property
 * @param  {Number} newPriority New priority
 * @param  {Number} [currentPriority=0] Existing priority of previous change
 * @return {Boolean} true, if new priority allows to change property
 * @throws {PermissionDeniedError} If new priority is invalid or less than
 *    current priority
 * @memberOf module:models/role~Role
 * @alias module:models/role~Role.checkPriorities
 * @static
 */
roleSchema.statics.checkPriorities = (newPriority, currentPriority = 0) => {
  if (newPriority === PRIORITY_NO_ACCESS) {
    throw new PermissionDeniedError(
      `User has no write access for this field`);
  }
  if (newPriority === PRIORITY_NO_ROLE) {
    throw new PermissionDeniedError(
      `User has no role assigned for this board`);
  }
  if (newPriority === PRIORITY_INVALID_FIELD) {
    throw new PermissionDeniedError(
      `Field is not editable or invalid`);
  }
  if (newPriority === PRIORITY_EMPTY_PERMISSION) {
    throw new PermissionDeniedError(
      `User permissions for this action is undefined`);
  }
  if (newPriority === PRIORITY_INVALID_VALUE) {
    throw new PermissionDeniedError(
      `User has no permission to set field to this value`);
  }
  if (newPriority === PRIORITY_NO_PASSWORD) {
    throw new PermissionDeniedError(
      `User is not logged in and post password is incorrect`);
  }
  if (newPriority < currentPriority) {
    throw new PermissionDeniedError(
      `User priority ${newPriority} is less than current priority ${currentPriority}`);
  }
  return true;
};


/**
 * Get priority for modifying document field
 * @param  {Role} role             Role document
 * @param  {String} permissionName Key of permissions object
 * @param  {String} fieldName      Name of modified field
 * @param  {}       newValue       Value of modified field
 * @return {Number}                Priority of change action. Negative values
 *    indicate invalid priorities.
 * @memberOf module:models/role~Role
 * @alias module:models/role~Role.getWritePriority
 * @static
 */
roleSchema.statics.getWritePriority = (role, permissionName, fieldName, newValue) => {
  if (!role) {
    // user has no role assigned to this board
    return PRIORITY_NO_ROLE;
  }
  if (!role[permissionName]) {
    // permission is empty
    return PRIORITY_EMPTY_PERMISSION;
  }
  if (!role[permissionName][fieldName]) {
    // invalid field
    return PRIORITY_INVALID_FIELD;
  }
  const permission = role[permissionName][fieldName];
  if (permission.access === 'write-value') {
    const condition = permission.values.find((v) => {
      if (_.has(v, 'eq')) {
        return v.eq === newValue;
      }
      if (_.has(v, 'regexp')) {
        return v.regexp.test(newValue);
      }
      if (_.has(v, 'min') && _.has(v, 'max')) {
        return v.min <= newValue && v.max >= newValue;
      }
      if (_.has(v, 'min')) {
        return v.min <= newValue;
      }
      if (_.has(v, 'max')) {
        return v.max >= newValue;
      }
      return false;
    });
    if (condition) {
      return condition.priority;
    }
    return PRIORITY_INVALID_VALUE;
  }
  if (permission.access === 'write-any') {
    return permission.priority;
  }
  // user has no write permission
  return PRIORITY_NO_ACCESS;
};


/**
 * Get maximum priority for modifying document field from array of roles
 * @param  {Role[]} role           Array of roles
 * @param  {String} permissionName Key of permissions object
 * @param  {String} fieldName      Name of modified field
 * @param  {}       newValue       Value of modified field
 * @return {Object}                Object with fields `priority`, `roleName`
 * @memberOf module:models/role~Role
 * @alias module:models/role~Role.getMaxWritePriority
 * @static
 */
roleSchema.statics.getMaxWritePriority = (roles, permissionName, fieldName, newValue) => {
  if (!roles.length) {
    return {
      roleName: '',
      priority: PRIORITY_NO_PASSWORD,
    };
  }
  const prioities = _.sortBy(_.map(roles, role => ({
    roleName: role.roleName,
    priority: Role.getWritePriority(role, permissionName, fieldName, newValue)
  })), 'priority');
  return _.last(prioities);
};


/**
 * Get predefined role
 * @param {String} specialRoleName What role to return (admin, anonymous)
 * @memberOf module:models/role~Role
 * @alias module:models/role~Role.getSpecialRole
 * @static
 * @return {?Object} Frozen role object
 */
roleSchema.statics.getSpecialRole = (specialRoleName) => {
  if (specialRoleName == 'admin') {
    return adminRole;
  }
  if (specialRoleName == 'poster') {
    return posterRole;
  }
  return null;
};


roleSchema.statics.apiQuery = createApiQueryHandler({
    'all': {
      selectByDefault: false,
      alias: [
        'roleName',
        'displayName',
        'hierarchy',
        'postPermissions.isSticky',
        'postPermissions.isClosed',
        'postPermissions.isSage',
        'postPermissions.isApproved',
        'postPermissions.isDeleted',
        'attachmentPermissions.isDeleted',
        'attachmentPermissions.isNSFW',
        'attachmentPermissions.isSpoiler',
        'postingPrivileges.ignoreCaptcha',
        'postingPrivileges.ignoreClosed',
        'postingPrivileges.ignoreForcedAnon',
        'postingPrivileges.canUseMarkdown',
        'postingPrivileges.canFakeTimestamp',
        'reportActions.canViewReports',
        'reportActions.canDeleteReports',
        'reportPermissions.isDeleted',
      ],
    },
    'roleName': {
      selectByDefault: true,
      filter: true,
    },
    'displayName': {
      selectByDefault: true,
      filter: true,
    },
    'hierarchy': {
      selectByDefault: true,
      filter: true,
    },
    'postPermissions': {
      alias: [
        'postPermissions.isSticky',
        'postPermissions.isClosed',
        'postPermissions.isSage',
        'postPermissions.isApproved',
        'postPermissions.isDeleted',
      ],
    },
    'attachmentPermissions': {
      alias: [
        'attachmentPermissions.isDeleted',
        'attachmentPermissions.isNSFW',
        'attachmentPermissions.isSpoiler',
      ],
    },
    'postingPrivileges': {
      alias: [
        'postingPrivileges.ignoreCaptcha',
        'postingPrivileges.ignoreClosed',
        'postingPrivileges.ignoreForcedAnon',
        'postingPrivileges.canUseMarkdown',
        'postingPrivileges.canFakeTimestamp',
      ],
    },
    'reportActions': {
      alias: [
        'reportActions.canViewReports',
        'reportActions.canDeleteReports',
      ],
    },
    'reportPermissions': {
      alias: [
        'reportPermissions.isDeleted',
      ],
    },
    'postPermissions.isSticky'           : { selectByDefault: true, filter: false },
    'postPermissions.isClosed'           : { selectByDefault: true, filter: false },
    'postPermissions.isSage'             : { selectByDefault: true, filter: false },
    'postPermissions.isApproved'         : { selectByDefault: true, filter: false },
    'postPermissions.isDeleted'          : { selectByDefault: true, filter: false },
    'attachmentPermissions.isDeleted'    : { selectByDefault: true, filter: false },
    'attachmentPermissions.isNSFW'       : { selectByDefault: true, filter: false },
    'attachmentPermissions.isSpoiler'    : { selectByDefault: true, filter: false },
    'postingPrivileges.ignoreCaptcha'    : { selectByDefault: true, filter: false },
    'postingPrivileges.ignoreClosed'     : { selectByDefault: true, filter: false },
    'postingPrivileges.ignoreForcedAnon' : { selectByDefault: true, filter: false },
    'postingPrivileges.canUseMarkdown'   : { selectByDefault: true, filter: false },
    'postingPrivileges.canFakeTimestamp' : { selectByDefault: true, filter: false },
    'reportActions.canViewReports'       : { selectByDefault: true, filter: false },
    'reportActions.canDeleteReports'     : { selectByDefault: true, filter: false },
    'reportPermissions.isDeleted'        : { selectByDefault: true, filter: false },
  });


const Role = module.exports = mongoose.model('Role', roleSchema);
