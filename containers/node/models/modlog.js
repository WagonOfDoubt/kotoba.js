/**
 * Models for Modlog entries.
 * @module models/modlog
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const Int32 = require('mongoose-int32');
const useragentSchema = require('./schema/useragent');
const changeSchema = require('./schema/change');


// Schema representing set of actions performed by user in one request
const modlogEntrySchema = Schema({
  // when action was executed
  timestamp:           { type: Date, default: Date.now },  // generated

  // info about user who initiated action
  // ip of initiator
  ip:                  { type: String, required: true },
  // useragent of initiator
  useragent:           { type: useragentSchema, required: true },
  // if user is logged in, profile of this user
  // can be empty if user was not logged in
  user:                { type: ObjectId, ref: 'User' },

  // info about target post, if action has something to do with posts
  // list of changes that was performed on target posts
  changes:             [ changeSchema ],
  // whether or not initiator entered correct password for target posts
  isPasswordMatched:   { type: Boolean, default: false },
},
// options
{
  collection: 'modlog',
  strict: true,
  minimize: true,
});


const ModlogEntry = module.exports = mongoose.model('ModlogEntry', modlogEntrySchema);
