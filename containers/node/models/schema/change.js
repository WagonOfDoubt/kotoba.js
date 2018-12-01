/**
 * Schema representing atomic change on one document property
 * @module models/shcema/change
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;


module.exports = Schema({
  /** ObjectId of whatever object was changed */
  target:              { type: ObjectId, required: true, refPath: 'changes.model' },
  /** Name of mongoose model of object that was changed */
  model:               { type: String, required: true },
  /** Name of roperty that was changed */
  property:            { type: String, required: true },
  /** Initial value */
  oldValue:            { type: Mixed, required: true },  // any type
  /** Value that initial value was changed to */
  newValue:            { type: Mixed, required: true },  // any type
},
// options
{
  strict: true,
  minimize: true,
});
