const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newsSchema = Schema({
  number:       { type: Number, required: true, unique: true, index: true },
  subject:      { type: String, default: '' },
  message:      { type: String, default: '' },
  postedDate:   { type: Date, default: Date.now },
  postedby:     { type: String, default: '' },
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
