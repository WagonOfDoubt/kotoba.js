/**
 * Mongoose model representing configurable site assets (images for logo,
 * attachment placeholders, banners, etc.)
 * @module models/asset
 */

const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const attachmentSchema = require('./schema/attachment');


const Asset = module.exports = mongoose.model('Asset', {
  /** @type {Boolean} Uploaded file md5 hash (hex string) */
  hash:                { type: String, index: true },
  /** @type {String} Original file name */
  name:                { type: String },
  /** @type {String} Path where uploaded file was saved */
  file:                { type: String },
  /** @type {Number} Uploaded file width in pixels, if it is image or video */
  width:               { type: Number },
  /** @type {Number} Uploaded file height in pixels, if it is image or video */
  height:              { type: Number },
  /** @type {String} Path of generated thumbnail */
  thumb:               { type: String },
  /** @type {Number} Generated thumbnail width in pixels */
  thumbWidth:          { type: Number },
  /** @type {Number} Generated thumbnail height in pixels */
  thumbHeight:         { type: Number },
  /** @type {Number} Duration in seconds for video and audio files */
  duration:            { type: Number },
  /** @type {String} Media type as recognized by engine (image, video, etc) */
  type: {
    type: String,
    enum: [
      'archive',
      'audio',
      'document',
      'image',
      'unknown',
      'video',
    ],
  },
  /** @type {String} MIME type of uploaded file */
  mimetype:            { type: String, required: true },
  /** @type {Number} File size in bytes */
  size:                { type: Number },
  /** @type {Boolean} Is attachment set for deletion */
  isDeleted:           { type: Boolean, default: false },
  /**
   * READ ONLY. Date of document creation.
   * @type {Date}
   */
  timestamp:           { type: Date, default: Date.now },
  /**
   * User who uploaded this asset.
   * @type {ObjectId}
   */
  user:                { type: ObjectId, ref: 'User' },
  /** @type {String} Where asset is supposed to be used on site */
  category: {
    type: String,
    enum: [
      'banner',
      'bg',
      'favicon',
      'logo',
      'misc',
      'news',
      'placeholder',
      'style',
    ],
  },
});
