/**
 * Reflink schema, does not have collection on it's own, used as subdocument
 * @module models/shcema/reflink
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Int32 = require('mongoose-int32');
const ObjectId = mongoose.Schema.Types.ObjectId;


module.exports = Schema({
  /** Referenced post ObjectId */
  src: {
    type: ObjectId,
    ref: 'Post'
  },
  /** Referenced post board */
  boardUri: { type: String },
  /** Referenced post sequential number */
  postId: { type: Int32 },
  /** Referenced post thread sequential number */
  threadId: { type: Int32 },
  /** Is referenced post is topic starter */
  isOp:     { type: Boolean },
},
// options
{
  strict: true,
  minimize: true,
});
