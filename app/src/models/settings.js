/**
 * Settings model module
 * @module models/settings
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const schemaUtils = require('../utils/schema');
const fs = require('fs');

const faqDefault = fs.readFileSync('txt/faq_default.md');
const rulesDefault = fs.readFileSync('txt/rules_default.md');
const menuDefault = fs.readFileSync('txt/menu_default.md');
const frameDefault = fs.readFileSync('txt/frame_default.md');


/**
 * A model for global site settings that can be changed through admin interface
 * @class Settings
 * @extends external:Model
 */
const settingsSchema = Schema({
  /**
   * The name of the site
   * @type {String}
   * @default "kotoba"
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  siteName:      { type: String, default: 'kotoba' },
  /**
   * Site slogan
   * @type {String}
   * @default "A cat is fine too."
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  slogan:        { type: String, default: 'A cat is fine too.' },
  /**
   * Short description for metadata
   * @type {String}
   * @default "Imageboard based on kotoba.js engine."
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  desc:          { type: String, default: 'Imageboard based on kotoba.js engine.' },
  /**
   * Default locale (global locale and default for new boards)
   * @type {String}
   * @default "en"
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  locale:        { type: String, default: 'en' },
  /**
   * Default date format
   * @type {String}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  dateformat:    { type: String, default: '' },
  /**
   * Path to default header image
   * @type {String}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  imageUri:      { type: String, default: '' },
  /**
   * If true, first page in page selector labeled as 1 (one), otherwise, first
   * page will be labeled as "0", second as "1" and so forth
   * @type {Boolean}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  startWithOne:  { type: Boolean, default: false },
  /**
   * Size of attachment's thumbnail in post
   * @type {Object}
   * @property {Number} width Thumbnail width in pixels
   * @property {Number} height Thumbnail height in pixels
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  thumbSize:     {
    width:  { type: Number, default: 200 },
    height: { type: Number, default: 200 }
  },
  /**
   * Default style for site
   * @type {String}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  defaultStyle:   { type: String, default: 'umnochan' },
  /**
   * Type of style selector at the top of page
   * @type {String}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  styleSelectorType: { type: String, default: 'list', enum: ['none', 'list', 'combobox'] },
  /**
   * Minimum time in seconds a user must wait before posting a new thread again
   * @type {Number}
   * @default 30
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  newThreadDelay: { type: Number, default: 30 },
  /**
   * Minimum time in seconds a user must wait before posting a reply again
   * @type {Number}
   * @default 7
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  replyDelay:     { type: Number, default: 7 },
  /**
   * Optional engine features
   * @type {Object}
   * @property {Boolean} [expandThread=true] Whether or not to add expand thread buttons
   * @property {Boolean} [hideThread=true] Whether or not to add hide thread buttons
   * @property {Boolean} [hidePost=true] Whether or not to add hide buttons on posts
   * @property {Boolean} [favorites=true] Whether or not to add thread watching capabilities
   * @property {Boolean} [refmaps=true] Whether or not to add quick reply buttons on posts
   * @property {Boolean} [quickreply=true] Whether or not to show list of replies and references at bottom of posts
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  features: {
    expandThread: { type: Boolean, default: true },
    hideThread:   { type: Boolean, default: true },
    hidePost:     { type: Boolean, default: true },
    favorites:    { type: Boolean, default: true },
    refmaps:      { type: Boolean, default: true },
    quickreply:   { type: Boolean, default: true }
  },
  /**
   * HTML of FAQ section displayed on front page of site
   * @type {String}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  faq: { type: String, default: faqDefault },
  /**
   * HTML of Rules section displayed on front page of site
   * @type {String}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  rules: { type: String, default: rulesDefault },
  /**
   * HTML of FAQ section displayed on top of each page
   * @type {String}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  menu: { type: String, default: menuDefault },
  /**
   * HTML of default tab of sidebar
   * @type {String}
   * @memberOf module:models/settings~Settings#
   * @instance
   */
  frame: { type: String, default: frameDefault },
}, {
  collection: 'settings',
  minimize: false
});

let cachedSettings = null;


/**
 * Get value of one of settings parameters, or whole settings document
 * @async
 * @param {String} [param] - if this argument is present, only value of this
 *    parameter will be returned
 * @returns {(*|Object)} If called without any arguments, whole settings
 *    document will be returned, otherwise, returns value of corresponding
 *    property
 * @alias module:models/settings.get
 */
settingsSchema.statics.get = async (param) => {
  let settings;
  if (cachedSettings) {
    settings = cachedSettings;
  } else {
    settings = await Settings.findOne().exec();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    cachedSettings = settings;
  }
  if (param) {
    return settings[param];
  }
  return settings;
};


/**
 * Change settings properties and save it to database
 * @async
 * @param {Object} options - an object with fields and values to update
 * @returns {Object} settings object with updated fields
 * @alias module:models/settings.set
 */
settingsSchema.statics.set = async (options) => {
  const s = await Settings.findOneAndUpdate({},
    { $set: options}, { new: true });
  cachedSettings = s;
  return s;
};


/**
 * Get default values for settings properties
 * @alias module:models/settings.defaults
 * @returns {Object} settings object where all values are default
 * @alias module:models/settings.defaults
 */
settingsSchema.statics.defaults = () => {
  return schemaUtils.getDefaults(settingsSchema.obj);
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Object.freeze({
  get: Settings.get,
  set: Settings.set,
  defaults: Settings.defaults
});
