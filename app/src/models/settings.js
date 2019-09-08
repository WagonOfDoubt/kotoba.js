/**
 * A model for global site settings that can be changed through admin interface
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

const settingsSchema = Schema({
  /** The name of the site */
  siteName:      { type: String, default: 'kotoba' },
  /** Site slogan */
  slogan:        { type: String, default: 'A cat is fine too.' },
  /** Short description for metadata */
  desc:          { type: String, default: 'Imageboard based on kotoba.js engine.' },
  /** Default locale (global locale and default for new boards) */
  locale:        { type: String, default: 'en' },
  /** Default date format */
  dateformat:    { type: String, default: '' },
  /** Path to default header image */
  imageUri:      { type: String, default: '' },
  /**
   * If true, first page in page selector labeled as 1 (one), otherwise, first
   * page will be labeled as "0", second as "1" and so forth
   */
  startWithOne:  { type: Boolean, default: false },
  /** Size of attachment's thumbnail in post */
  thumbSize:     {
    /** thumbnail width in pixels */
    width:  { type: Number, default: 200 },
    /** thumbnail height in pixels */
    height: { type: Number, default: 200 }
  },
  /** Default style for site */
  defaultStyle:   { type: String, default: 'umnochan' },
  /** Type of style selector at the top of page */
  styleSelectorType: { type: String, default: 'list', enum: ['none', 'list', 'combobox'] },
  /** Minimum time in seconds a user must wait before posting a new thread again */
  newThreadDelay: { type: Number, default: 30 },
  /** Minimum time in seconds a user must wait before posting a reply again */
  replyDelay:     { type: Number, default: 7 },
  /** Optional engine features */
  features: {
    /** Whether or not to add expand thread buttons */
    expandThread: { type: Boolean, default: true },
    /** Whether or not to add hide thread buttons */
    hideThread:   { type: Boolean, default: true },
    /** Whether or not to add hide buttons on posts */
    hidePost:     { type: Boolean, default: true },
    /** Whether or not to add thread watching capabilities */
    favorites:    { type: Boolean, default: true },
    /** Whether or not to add quick reply buttons on posts */
    refmaps:      { type: Boolean, default: true },
    /** Whether or not to show list of replies and references at bottom of posts */
    quickreply:   { type: Boolean, default: true }
  },
  /** HTML of FAQ section displayed on front page of site */
  faq: { type: String, default: faqDefault },
  /** HTML of Rules section displayed on front page of site */
  rules: { type: String, default: rulesDefault },
  /** HTML of FAQ section displayed on top of each page */
  menu: { type: String, default: menuDefault },
  /** HTML of default tab of sidebar */
  frame: { type: String, default: frameDefault },
}, {
  collection: 'settings',
  // capped: { size: 1024, max: 1 },
  minimize: false
});

let cachedSettings = null;


/**
 * Get value of one of settings parameters, or whole settings document
 * @alias module:models/settings.get
 * @async
 * @param {string=} param - if this argument is present, only value of this
 *    parameter will be returned
 * @returns {(*|object)} If called without any arguments, whole settings
 *    document will be returned, otherwise, returns value of corresponding
 *    property
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
 * @alias module:models/settings.set
 * @async
 * @param {object} options - an object with fields and values to update
 * @returns {object} settings object with updated fields
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
 * @returns {object} settings object where all values are default
 */
settingsSchema.statics.defaults = () => {
  return schemaUtils.getDefaults(settingsSchema.obj);
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = {
  get: Settings.get,
  set: Settings.set,
  defaults: Settings.defaults
};
