/**
 * Mongoose model representing configurable site assets (images for logo,
 * attachment placeholders, banners, etc.)
 * @module models/asset
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;


/**
 * Asset Mongoose model
 * @class Asset
 * @extends external:Model
 */
const assetSchema = Schema({
  /**
   * Uploaded file md5 hash (hex string)
   * @type {String}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  hash:                { type: String, index: true },
  /**
   * Original file name
   * @type {String}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  name:                { type: String },
  /**
   * Path where uploaded file was saved
   * @type {String}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  file:                { type: String },
  /**
   * Uploaded file width in pixels
   * @type {Number}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  width:               { type: Number },
  /**
   * Uploaded file height in pixels
   * @type {Number}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  height:              { type: Number },
  /**
   * Path of generated thumbnail
   * @type {String}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  thumb:               { type: String },
  /**
   * Generated thumbnail width in pixels
   * @type {Number}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  thumbWidth:          { type: Number },
  /**
   * Generated thumbnail height in pixels
   * @type {Number}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  thumbHeight:         { type: Number },
  /**
   * Duration in seconds for video and audio files
   * @type {Number}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  duration:            { type: Number },
  /**
   * Media type as recognized by engine (image, video, etc)
   * @type {String}
   * @memberOf module:models/asset~Asset
   * @instance
   */
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
  /**
   * MIME type of uploaded file
   * @type {String}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  mimetype:            { type: String, required: true },
  /**
   * File size in bytes
   * @type {Number}
   * @memberOf module:models/asset~Asset
   * @instance
   */
  size:                { type: Number },
  /**
   * Is attachment set for deletion
   * @type {Boolean}
   * @memberOf module:models/asset~Asset
   * @instance
   * @default false
   */
  isDeleted:           { type: Boolean, default: false },
  /**
   * READ ONLY. Date of document creation.
   * @type {Date}
   * @memberOf module:models/asset~Asset
   * @instance
   * @readOnly
   */
  createdAt:           { type: Date, default: Date.now, immutable: true },
  /**
   * User who uploaded this asset.
   * @type {ObjectId}
   * @memberOf module:models/asset~Asset
   * @instance
   * @readOnly
   */
  createdBy:           { type: ObjectId, ref: 'User', immutable: true },
  /**
   * Where asset is supposed to be used on site
   * @type {String}
   * @memberOf module:models/asset~Asset
   * @instance
   */
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


const Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset;
