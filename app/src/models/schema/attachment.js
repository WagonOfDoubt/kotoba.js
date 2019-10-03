/**
 * Attachment schema, does not have collection on it's own, used as sub-document
 * @module models/schema/attachment
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * @typedef {Object} Attachment
 * @property {String} hash Uploaded file md5 hash (hex string)
 * @property {String} name Original file name
 * @property {String} file Path where uploaded file was saved
 * @property {Number} width Uploaded file width in pixels, if it is image or
 *    video
 * @property {Number} height Uploaded file height in pixels, if it is image or
 *    video
 * @property {String} thumb Path of generated thumbnail
 * @property {Number} thumbWidth Generated thumbnail width in pixels
 * @property {Number} thumbHeight Generated thumbnail height in pixels
 * @property {Number} duration Duration in seconds for video and audio files
 * @property {String} type Attachment type (image, video, etc)
 * @property {Number} size Attachment file size in bytes
 * @property {String} isDeleted Is attachment set for deletion
 * @property {String} isNSFW Is attachment set as not safe for work
 * @property {String} isSpoiler Is attachment set as spoiler
 * @public
 */
module.exports = Schema({
  hash:                { type: String, index: true },
  name:                { type: String },
  file:                { type: String },
  width:               { type: Number },
  height:              { type: Number },
  thumb:               { type: String },
  thumbWidth:          { type: Number },
  thumbHeight:         { type: Number },
  duration:            { type: Number },
  type:                { type: String, enum: ['image', 'video', 'audio', 'document', 'archive', 'unknown'] },
  size:                { type: Number },
  isDeleted:           { type: Boolean, default: false },
  isNSFW:              { type: Boolean, default: false },
  isSpoiler:           { type: Boolean, default: false },
},
// options
{
  strict: true,
  minimize: true,
});
