/**
 * Schema representing atomic change on one document property
 * @module models/schema/change
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const Int32 = require('mongoose-int32');


module.exports = Schema({
  /** @type {ObjectId} ObjectId of whatever object was changed */
  target:              { type: ObjectId, required: true, refPath: 'changes.model' },
  /** @type {String} Name of mongoose model of object that was changed */
  model:               { type: String, required: true },
  /** @type {String} Name of property that was changed */
  property:            { type: String, required: true },
  /** @type {Mixed} Initial value */
  oldValue:            { type: Mixed },
  /** @type {Mixed} Value that initial value was changed to */
  newValue:            { type: Mixed, required: true, alias: 'value' },
  /** @type {Int32} Previous user priority, if it was defined */
  oldPriority:         { type: Int32 },
  /** @type {Int32} User priority for making this change */
  newPriority:         { type: Int32, alias: 'priority' },
  /** @type {String} User role that granted permission for making this change */
  roleName:            { type: String },
},
// options
{
  strict: true,
  minimize: true,
});
