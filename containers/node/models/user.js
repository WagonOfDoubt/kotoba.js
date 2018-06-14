const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const config = require('../config.json');


const boardPermissionsSchema = Schema({
  board: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Board'
  },
  status: {
    type: String,
    required: true
  },
  permissions: [ String ]
});

const userSchema = Schema({
  login:               { type: String, required: true },
  // md5 hash of password
  // select: false makes User.find() not include this field by default
  password:            { type: String, required: true, select: false },
  contacts:            { type: String },
  addedon:             { type: Date, default: Date.now},
  lastactive:          { type: Date, default: Date.now},
  displayname:         { type: String, default: '' },
  authority:           { type: String, required: true },
  boards:              [ boardPermissionsSchema ],
  settings:            { type: String }
});

userSchema.pre('save', async function(next) {
  this.password = await bcrypt.hash(this.password, config.salt_rounds);
  next();
});


userSchema.methods.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};


userSchema.statics.hashPassword = async function(password) {
  return await bcrypt.hash(password, config.salt_rounds);
}

const User = module.exports = mongoose.model('User', userSchema);
