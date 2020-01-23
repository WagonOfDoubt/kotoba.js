/**
 * Model for user-defined styles.
 * @module models/style
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const defaultSyles = require('../json/defaultstyles.json');
const path = require('path');
const _ = require('lodash');
const config = require('../json/config.json');
const pug = require('pug');
const { createApiQueryHandler } = require('../utils/model');
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


/**
 * Style model
 * @class Style
 * @extends external:Model
 */
const styleSchema = Schema({
  /**
   * Name of style also serving as unique id of style
   * @type {String}
   * @memberOf module:models/style~Style#
   * @instance
   * @readOnly
   */
  name:         {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    minlength: 1,
    validate: nameValidators,
    immutable: true,
  },
  /**
   * Reference to user who created this style
   * @type {ObjectId}
   * @memberOf module:models/style~Style#
   * @instance
   * @readOnly
   */
  createdBy:    { type: ObjectId, ref: 'User', immutable: true },
  /**
   * When style was created
   * @type {Date}
   * @memberOf module:models/style~Style#
   * @instance
   * @readOnly
   */
  createdAt:    { type: Date, default: Date.now, immutable: true },
  /**
   * When style was updated
   * @type {Date}
   * @memberOf module:models/style~Style#
   * @instance
   */
  updatedAt:    { type: Date, default: Date.now },
  /**
   * CSS color variables
   * @type {Map}
   * @memberOf module:models/style~Style#
   * @instance
   */
  colors:       { type: Map, of: String },
  /**
   * CSS text variables
   * @type {Map}
   * @memberOf module:models/style~Style#
   * @instance
   */
  strings:      { type: Map, of: String },
  /**
   * Other CSS variables
   * @type {Map}
   * @memberOf module:models/style~Style#
   * @instance
   */
  variables:    { type: Map, of: String },
  /**
   * Additional plain CSS
   * @type {String}
   * @memberOf module:models/style~Style#
   * @instance
   */
  css:          { type: String, default: '' },
});


const styleCache = new Map();


/**
 * If styles collection is empty, adds default built-in styles to collection
 * @memberOf module:models/style~Style
 * @name ensureDefaults
 * @function
 * @static
 */
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


/**
 * Clear style cache
 * @memberOf module:models/style~Style
 * @name invalidateCache
 * @function
 * @static
 */
styleSchema.static('invalidateCache', () => {
  styleCache.clear();
});


/**
 * Get style cache
 * @memberOf module:models/style~Style
 * @name getCache
 * @static
 * @function
 * @return {Map} Styles cache
 */
styleSchema.static('getCache', () => {
  return styleCache;
});


/**
 * Retrieve style either from cache or from database
 * @param  {String} name             Style name
 * @async
 * @return {Style}                   Style document
 * @memberOf module:models/style~Style
 * @name findByName
 * @function
 * @static
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
 * @memberOf module:models/style~Style
 * @name findAll
 * @function
 * @static
 */
styleSchema.static('findAll', async () => {
  if (styleCache.size === 0) {
    const newStyles = await Style.find().populate('createdBy', 'login').exec();
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
 * @memberOf module:models/style~Style
 * @name getList
 * @function
 * @static
 */
styleSchema.static('getList', async () => {
  if (styleCache.size === 0) {
    await Style.findAll();
  }
  return Array.from(styleCache.keys());
});


styleSchema.post('save', (doc) => {
  doc.populate('createdBy', 'login');
  styleCache.set(doc.name, doc);
});


styleSchema.post('remove', (doc) => {
  styleCache.delete(doc.name);
});


/**
 * Name of style with starting capital letter
 * @type {String}
 * @memberOf module:models/style~Style
 * @name capitalizedName
 * @instance
 * @readOnly
 */
styleSchema.virtual('capitalizedName').get(function () {
  return this.name[0].toUpperCase() + this.name.substring(1);
});


/**
 * CSS code of style
 * @type {String}
 * @memberOf module:models/style~Style
 * @name rawCSS
 * @instance
 * @readOnly
 */
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


/**
 * A helper function to read documents from DB based on user-defined query
 * @async
 * @param  {String}   [options.search=""] Search string.
 * @param  {Object}   [options.filter={}] Filter object. Fields are field
 *    names and values are either desired values to match or object with one
 *    key-value pair where key is one of operators:
 *    
 *    - `$eq`   Matches values that are equal to a specified value.
 *    - `$gt`   Matches values that are greater than a specified value.
 *    - `$gte`  Matches values that are greater than or equal to a specified value.
 *    - `$in`   Matches any of the values specified in an array.
 *    - `$lt`   Matches values that are less than a specified value.
 *    - `$lte`  Matches values that are less than or equal to a specified value.
 *    - `$ne`   Matches all values that are not equal to a specified value.
 *    - `$nin`  Matches none of the values specified in an array.
 *
 * @param  {String[]} [options.select=[]] Which document fields to include. If
 *    empty, all available fields will be selected.
 * @param  {Object}   [options.sort={}]   Specify in the sort parameter the
 *    field or fields to sort by and a value of 1 or -1 to specify an
 *    ascending or descending sort respectively.
 * @param  {Number}   [options.skip=0]    How many documents to skip at the
 *    start.
 * @param  {Number}   [options.limit=50] How many documents to return. If
 *    limit is 1, returns single matched document, if limit > 1, object with
 *    array of documents and count of documents.
 * @return {(Document|module:utils/model~ApiQueryResponse)}   If limit = 1,
 *    returns single matched document, if limit > 1, object with array of
 *    documents and count of matched documents.
 *
 * @throws {TypeError} If skip or limit parameter is not an integer
 * @throws {TypeError} If argument for $-operator in filter object is invalid
 * @alias module:models/board~Board.apiQuery
 * @memberOf module:models/board~Board
 */
styleSchema.statics.apiQuery = createApiQueryHandler({
    'name': {
      selectByDefault: true,
      filter: true,
    },
    'createdBy': {
      selectByDefault: false,
      filter: false,
      alias: ['createdBy.name', 'createdBy.login', 'createdBy.authority'],
    },
    'createdBy.name': {
      selectByDefault: false,
      filter: false,
      populate: ['createdBy', 'name'],
    },
    'createdBy.login': {
      selectByDefault: false,
      filter: false,
      populate: ['createdBy', 'login'],
    },
    'createdBy.authority': {
      selectByDefault: false,
      filter: false,
      populate: ['createdBy', 'authority'],
    },
    'createdAt': {
      selectByDefault: false,
      filter: true,
    },
    'updatedAt': {
      selectByDefault: true,
      filter: true,
    },
    'colors': {
      selectByDefault: false,
      filter: false,
    },
    'strings': {
      selectByDefault: false,
      filter: false,
    },
    'variables': {
      selectByDefault: false,
      filter: false,
    },
    'css': {
      selectByDefault: false,
      filter: false,
    },
    'rawCSS': {
      selectByDefault: true,
      filter: false,
      dependsOn: [
        'colors',
        'variables',
        'strings',
        'css',
      ],
    },
  });


const Style = module.exports = mongoose.model('Style', styleSchema);
