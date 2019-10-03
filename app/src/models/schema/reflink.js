/**
 * Reflink schema, does not have collection on it's own, used as sub-document
 * @module models/schema/reflink
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Int32 = require('mongoose-int32');
const ObjectId = mongoose.Schema.Types.ObjectId;


/**
 * @typedef {Object} Reflink
 * @param {ObjectId} src Referenced post ObjectId
 * @param {String} boardUri Referenced post board
 * @param {Int32} postId Referenced post sequential number
 * @param {Int32} threadId Referenced post thread sequential number
 * @param {Boolean} isOp Is referenced post is topic starter
 * @public
 */
module.exports = Schema({
  src: {
    type: ObjectId,
    ref: 'Post'
  },
  boardUri: { type: String },
  postId: { type: Int32 },
  threadId: { type: Int32 },
  isOp:     { type: Boolean },
},
// options
{
  strict: true,
  minimize: true,
});
