/**
 * Model for moderator roles.
 * @module models/role
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Mixed = mongoose.Schema.Types.Mixed;


const propertyAccessSchema = Schema({
  priority: {
    type: Number,
    min: 0,
    max: 9999,
    default: 10,
    get: v => Math.round(v),
    set: v => Math.round(v),
  },
  access: {
    type: String,
    enum: ['no-access', 'read-only', 'wirte-any', 'write-value'],
    required: true,
    default: 'no-access',
  },
  /**
   * If access is "wite-value", this array specifies priorities for each
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
        default: 10,
        get: v => Math.round(v),
        set: v => Math.round(v),
      },
      // value constarints
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
      validator: (v) => /^[a-zA-Z0-9]+$/,
      message: `Role name must contain only latin letters and numbers [a-zA-Z0-9]`,
    },
  },
  hierarchy: {
    type: Number,
    min: 0,
    max: 9999,
    required: true,
    default: 10,
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
              frst: {
                  "$arrayElemAt": ["$usedTimes", 0]
              }
            },
            in: { $max: ["$$frst.total", 0] }
          },
        }
      }
    },
    {
      $sort: { hierarchy: -1 }
    }
  ]);
};


const Role = module.exports = mongoose.model('Role', roleSchema);
