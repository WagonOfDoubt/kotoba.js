/**
 * Model for user-defined styles.
 * @module models/styles
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const defaultSyles = require('../json/defaultstyles.json');
const path = require('path');
const _ = require('lodash');
const config = require('../json/config.json');
const pug = require('pug');
const userStyleTemplate = pug.compileFile(
  path.join(config.templates_path, 'includes/userstyle.pug'));


const nameValidators = [
  {
    validator: function(v) {
      return /^[a-z0-9_]*$/.test(v);
    },
    message: 'style name can contain only letters and numbers'
  },
];


const styleSchema = Schema({
  /** @type {String} Name of style also serving as unique id of style */
  name:         {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    minlength: 1,
    validate: nameValidators
  },
  /** @type {ObjectId} Reference to user who created this style */
  addedBy:      { type: ObjectId, ref: 'User' },
  /** @type {Date} When style was created */
  createdDate:  { type: Date, default: Date.now },
  /** @type {Date} When style was updated */
  updatedDate:  { type: Date, default: Date.now },
  /** @type {Map} CSS color variables */
  colors:       { type: Map, of: String },
  /** @type {Map} CSS text variables */
  strings:      { type: Map, of: String },
  /** @type {Map} Other CSS variables */
  variables:    { type: Map, of: String },
  /** @type {String} Additional plain CSS */
  css:          { type: String, default: '' },
});


const styleCache = new Map();


styleSchema.static('ensureDefaults', async () => {
  const numberOfStyles = await Style.countDocuments({});
  if (numberOfStyles === 0) {
    const newStyles = await Style.insertMany(defaultSyles, { rawResult: false });
    for (const s of newStyles) {
      styleCache.set(s.name, s);
    }
    return;
  }
  // cache styles
  await Style.findAll();
});


styleSchema.static('invalidateCache', () => {
  styleCache.clear();
});


styleSchema.static('getCache', () => {
  return styleCache;
});


/**
 * Retrieve style either from cache or from database
 * @param  {String} name             Style name
 * @async
 * @return {Style}                   Style document
 */
styleSchema.static('findByName', async (name) => {
  if (!styleCache.has(name)) {
    const s = await Style.findOne({ name }).exec();
    if (s) {
      styleCache.set(s.name, s);
    }
  }
  return styleCache.get(name);
});


/**
 * Retrieve all styles from database or from cache if possible
 * @async
 * @return {Style[]}                 Array of documents
 */
styleSchema.static('findAll', async () => {
  if (styleCache.size === 0) {
    const newStyles = await Style.find().populate('addedBy', 'login').exec();
    for (const s of newStyles) {
      styleCache.set(s.name, s);
    }
  }
  return Array.from(styleCache.values());
});


/**
 * Retrieve list of all style names
 * @async
 * @return {String[]}           Array of names
 */
styleSchema.static('getList', async () => {
  if (styleCache.size === 0) {
    await Style.findAll();
  }
  return Array.from(styleCache.keys());
});


styleSchema.post('save', (doc) => {
  doc.populate('addedBy', 'login');
  styleCache.set(doc.name, doc);
});


styleSchema.post('remove', (doc) => {
  styleCache.delete(doc.name);
});


styleSchema.virtual('capitalizedName').get(function () {
  return this.name[0].toUpperCase() + this.name.substring(1);
});


styleSchema.virtual('rawCSS').get(function () {
  const colors = this.colors ? _.fromPairs(Array.from(this.colors.entries())) : {};
  const variables = this.variables ? _.fromPairs(Array.from(this.variables.entries())) : {};
  const strings = this.strings ? _.fromPairs(Array.from(this.strings.entries())) : {};
  return userStyleTemplate({
    colors: colors,
    variables: variables,
    strings: strings,
    css: this.css,
  });
});


const Style = module.exports = mongoose.model('Style', styleSchema);
