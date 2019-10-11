/**
 * Model for news entries.
 * @module models/news
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Model of news entry on front page
 * @class News
 * @extends external:Model
 */
const newsSchema = Schema({
  /**
   * Sequential number of entry that can be used as unique id
   * @type {Number}
   * @memberOf module:models/news~News
   * @instance
   */
  number:       { type: Number, required: true, unique: true, index: true },
  /**
   * Entry subject
   * @type {String}
   * @memberOf module:models/news~News
   * @instance
   */
  subject:      { type: String, default: '' },
  /**
   * Entry message
   * @type {String}
   * @memberOf module:models/news~News
   * @instance
   */
  message:      { type: String, default: '' },
  /**
   * When entry was created
   * @type {Date}
   * @memberOf module:models/news~News
   * @instance
   * @readOnly
   */
  createdAt:   { type: Date, default: Date.now, immutable: true },
  /**
   * Who posted this entry
   * @type {String}
   * @memberOf module:models/news~News
   * @instance
   */
  name:     { type: String, default: '' },
  /**
   * E-mail of poster
   * @type {String}
   * @memberOf module:models/news~News
   * @instance
   */
  email:  { type: String, default: '' }
}, { collection: 'news' });


/**
 * Get last news entry number (id)
 * @return {Number} Value of last news entry number field
 * @memberOf module:models/news~News
 * @static
 * @alias module:models/news~News.findMaxNumber
 */
newsSchema.statics.findMaxNumber = async () => {
  const result = await News.findOne({}, {number: 1, _id: 0}).sort({number: -1});
  return result ? result.number : 0;
};


newsSchema.pre('validate', async function(next) {
  if (this.isNew) {
    const lastNumber = await News.findMaxNumber();
    this.number = lastNumber + 1;
  }
  next();
});


const News = module.exports = mongoose.model('News', newsSchema);
