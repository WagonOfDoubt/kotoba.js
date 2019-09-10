/**
 * Model for moderator roles.
 * @module models/role
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = mongoose.Schema.Types.Mixed;
const _ =require('lodash');


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
  /**
   * If access is "write-value", this array specifies priorities for each
   * individual value, range or pattern
   * @type {Array}
   */
  values: [
    {
      // value priority
      priority: {
        type: Number,
        min: 0,
        max: 9999,
        required: true,
        get: v => Math.round(v),
        set: v => Math.round(v),
      },
      // value constraints
      eq:     { type: Mixed },
      min:    { type: Number },
      max:    { type: Number },
      regexp: { type: String },
    }
  ]
});


const roleSchema = Schema({
  roleName: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v) => /^[a-z0-9]+$/,
      message: `Role name must contain only latin letters and numbers [a-zA-Z0-9]`,
    },
  },
  hierarchy: {
    type: Number,
    min: 0,
    max: 9999,
    required: true,
    get: v => Math.round(v),
    set: v => Math.round(v),
  },
  postPermissions: {
    // threads
    'isSticky': { type: propertyAccessSchema },
    'isClosed': { type: propertyAccessSchema },
    // posts
    'isSage': { type: propertyAccessSchema },
    'isApproved': { type: propertyAccessSchema },
    'isDeleted': { type: propertyAccessSchema },
  },
  attachmentPermissions: {
    // attachments
    'isDeleted': { type: propertyAccessSchema },
    'isNSFW': { type: propertyAccessSchema },
    'isSpoiler': { type: propertyAccessSchema },    
  },
});


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
  this.postPermissions.isSticky = this.postPermissions.isSticky || {};
  this.postPermissions.isSticky.priority =
    _.isNumber(this.postPermissions.isSticky.priority) ?
    this.postPermissions.isSticky.priority :
    this.hierarchy;
  this.postPermissions.isClosed = this.postPermissions.isClosed || {};
  this.postPermissions.isClosed.priority =
    _.isNumber(this.postPermissions.isClosed.priority) ?
    this.postPermissions.isClosed.priority :
    this.hierarchy;
  this.postPermissions.isSage = this.postPermissions.isSage || {};
  this.postPermissions.isSage.priority =
    _.isNumber(this.postPermissions.isSage.priority) ?
    this.postPermissions.isSage.priority :
    this.hierarchy;
  this.postPermissions.isApproved = this.postPermissions.isApproved || {};
  this.postPermissions.isApproved.priority =
    _.isNumber(this.postPermissions.isApproved.priority) ?
    this.postPermissions.isApproved.priority :
    this.hierarchy;
  this.postPermissions.isDeleted = this.postPermissions.isDeleted || {};
  this.postPermissions.isDeleted.priority =
    _.isNumber(this.postPermissions.isDeleted.priority) ?
    this.postPermissions.isDeleted.priority :
    this.hierarchy;
  this.attachmentPermissions.isDeleted = this.attachmentPermissions.isDeleted || {};
  this.attachmentPermissions.isDeleted.priority =
    _.isNumber(this.attachmentPermissions.isDeleted.priority) ?
    this.attachmentPermissions.isDeleted.priority :
    this.hierarchy;
  this.attachmentPermissions.isNSFW = this.attachmentPermissions.isNSFW || {};
  this.attachmentPermissions.isNSFW.priority =
    _.isNumber(this.attachmentPermissions.isNSFW.priority) ?
    this.attachmentPermissions.isNSFW.priority :
    this.hierarchy;
  this.attachmentPermissions.isSpoiler = this.attachmentPermissions.isSpoiler || {};
  this.attachmentPermissions.isSpoiler.priority =
    _.isNumber(this.attachmentPermissions.isSpoiler.priority) ?
    this.attachmentPermissions.isSpoiler.priority :
    this.hierarchy;
});


const Role = module.exports = mongoose.model('Role', roleSchema);
