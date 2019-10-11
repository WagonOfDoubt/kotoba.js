/**
 * Model for moderator roles
 * @module models/role
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = mongoose.Schema.Types.Mixed;
const _ =require('lodash');


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
    'isSticky': { type: propertyAccessSchema },
    'isClosed': { type: propertyAccessSchema },
    'isSage': { type: propertyAccessSchema },
    'isApproved': { type: propertyAccessSchema },
    'isDeleted': { type: propertyAccessSchema },
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
    'isDeleted': { type: propertyAccessSchema },
    'isNSFW': { type: propertyAccessSchema },
    'isSpoiler': { type: propertyAccessSchema },
  },
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
