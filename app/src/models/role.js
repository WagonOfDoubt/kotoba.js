/**
 * Model for moderator roles
 * @module models/role
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = mongoose.Schema.Types.Mixed;
const _ = require('lodash');
const deepFreeze = require('deep-freeze-strict');


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
  priority: {
    type: Number,
    min: 0,
    max: 9999,
    get: v => Math.round(v),
    set: v => Math.round(v),
    required: true,
  },
  access: {
    type: String,
    enum: ['no-access', 'read-only', 'write-any', 'write-value'],
    required: true,
    default: 'no-access',
  },
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
  ]
});


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
  }
});


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
  }
});


const anonymousRole = {
  roleName: '__anonymous',
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
};



/**
 * Get predefined role
 * @param {String} specialRoleName What role to return (admin, anonymous)
 * @memberOf module:models/role~Role
 * @alias module:models/role~Role.getSpecialRole
 * @static
 * @async
 * @return {?Object} Frozen role object
 */
roleSchema.statics.getSpecialRole = async (specialRoleName) => {
  if (specialRoleName == 'admin') {
    return adminRole;
  }
  if (specialRoleName == 'anonymous') {
    return anonymousRole;
  }
  return null;
};


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
});


const Role = module.exports = mongoose.model('Role', roleSchema);
