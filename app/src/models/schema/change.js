/**
 * Schema representing atomic change on one document property
 * @module models/schema/change
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const Int32 = require('mongoose-int32');


/**
 * @typedef {Object} Change
 * @property {ObjectId} target ObjectId of whatever object was changed
 * @property {String} model Name of mongoose model of object that was changed
 * @property {String} property Name of property that was changed
 * @property {Mixed} oldValue Initial value
 * @property {Mixed} newValue Value that initial value was changed to
 * @property {Int32} oldPriority Previous user priority, if it was defined
 * @property {Int32} newPriority User priority for making this change
 * @property {String} roleName User role that granted permission for making this change
 * @public
 */
module.exports = Schema({
  target:              { type: ObjectId, required: true, refPath: 'changes.model' },
  model:               { type: String, required: true },
  property:            { type: String, required: true },
  oldValue:            { type: Mixed },
  newValue:            { type: Mixed, required: true, alias: 'value' },
  oldPriority:         { type: Int32 },
  newPriority:         { type: Int32, alias: 'priority' },
  roleName:            { type: String },
},
// options
{
  strict: true,
  minimize: true,
});
