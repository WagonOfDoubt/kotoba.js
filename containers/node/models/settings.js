const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const schemaUtils = require('../utils/schema');
const fs = require('fs');

const faqDefault = fs.readFileSync('txt/faq_default.md');
const rulesDefault = fs.readFileSync('txt/rules_default.md');
const menuDefault = fs.readFileSync('txt/menu_default.md');
const frameDefault = fs.readFileSync('txt/frame_default.md');

const settingsSchema = Schema({
  siteName:      { type: String, default: 'kotoba' },
  slogan:        { type: String, default: 'A cat is fine too.' },
  desc:          { type: String, default: 'Imageboard based on kotoba.js engine.' },
  locale:        { type: String, default: 'en' },
  dateformat:    { type: String, default: '' },
  imageUri:      { type: String, default: '' },
  startWithOne:  { type: Boolean, default: false },
  thumbSize:     {
    width:  { type: Number, default: 200 },
    height: { type: Number, default: 200 }
  },
  styles:   { type: Array, default: [
    'umnochan',
    'burichan',
    'futaba',
    'photon',
    'kusaba',
    'bluemoon'
  ] },
  defaultStyle:   { type: String, default: 'umnochan' },
  newThreadDelay: { type: Number, default: 30 },
  replyDelay:     { type: Number, default: 7 },
  features: {
    expandThread: { type: Boolean, default: true },
    hideThread:   { type: Boolean, default: true },
    hidePost:     { type: Boolean, default: true },
    favorites:    { type: Boolean, default: true },
    refmaps:      { type: Boolean, default: true },
    quickreply:   { type: Boolean, default: true }
  },
  faq: { type: String, default: faqDefault },
  rules: { type: String, default: rulesDefault },
  menu: { type: String, default: menuDefault },
  frame: { type: String, default: frameDefault },
}, {
  collection: 'settings',
  // capped: { size: 1024, max: 1 },
  minimize: false
});

var cachedSettings = null;

settingsSchema.statics.get = async (param) => {
  let settings;
  if (cachedSettings) {
    settings = cachedSettings;
  } else {
    settings = await Settings.findOne().exec();
    if (!settings) {
      settings = new Settings();
      await settings.save();
      cachedSettings = settings;
    }
  }
  if (param) {
    return settings[param];
  }
  return settings;
};

settingsSchema.statics.set = async (options) => {
  const s = await Settings.findOneAndUpdate({},
    { $set: options}, { new: true });
  cachedSettings = s;
  return s;
};

settingsSchema.statics.defaults = () => {
  return schemaUtils.getDefaults(settingsSchema.obj);
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = {
  get: Settings.get,
  set: Settings.set,
  defaults: Settings.defaults
};
