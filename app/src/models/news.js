/**
 * Model for news entries.
 * @module models/news
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newsSchema = Schema({
  /** @type {Number} Sequential number of entry that can be used as unique id */
  number:       { type: Number, required: true, unique: true, index: true },
  /** @type {String} Entry subject */
  subject:      { type: String, default: '' },
  /** @type {String} Entry message */
  message:      { type: String, default: '' },
  /** @type {Date} When entry was created */
  postedDate:   { type: Date, default: Date.now },
  /** @type {String} Who posted this entry */
  postedby:     { type: String, default: '' },
  /** @type {String} E-mail of poster */
  postedemail:  { type: String, default: '' }
}, { collection: 'news' });

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
