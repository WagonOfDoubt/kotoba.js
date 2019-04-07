/**
 * Attachment schema, does not have collection on it's own, used as sub-document
 * @module models/schema/attachment
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


module.exports = Schema({
  /** Uploaded file md5 hash (hex string) */
  hash:                { type: String, index: true },
  /** Original file name */
  name:                { type: String },
  /** Path where uploaded file was saved */
  file:                { type: String },
  /** Uploaded file width in pixels, if it is image or video */
  width:               { type: Number },
  /** Uploaded file height in pixels, if it is image or video */
  height:              { type: Number },
  /** Path of generated thumbnail */
  thumb:               { type: String },
  /** Generated thumbnail width in pixels */
  thumbWidth:          { type: Number },
  /** Generated thumbnail height in pixels */
  thumbHeight:         { type: Number },
  /** Duration in seconds for video and audio files */
  duration:            { type: Number },
  /** Attachment type (image, video, etc) */
  type:                { type: String, enum: ['image', 'video', 'audio', 'document', 'archive', 'unknown'] },
  /** Attachment file size in bytes */
  size:                { type: Number },
  /** Is attachment set for deletion */
  isDeleted:           { type: Boolean, default: false },
  /** Is attachment set as not safe for work */
  isNSFW:              { type: Boolean, default: false },
  /** Is attachment set as spoiler */
  isSpoiler:           { type: Boolean, default: false },
},
// options
{
  strict: true,
  minimize: true,
});
