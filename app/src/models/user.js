const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Int32 = require('mongoose-int32');
const bcrypt = require('bcrypt');
const config = require('../config.json');
const Mixed = mongoose.Schema.Types.Mixed;

const Role = require('./role');


const userSchema = Schema({
  login:               { type: String, required: true },
  // md5 hash of password
  // select: false makes User.find() not include this field by default
  password:            { type: String, required: true, select: false },
  contacts:            { type: String },
  addedon:             { type: Date, default: Date.now},
  lastactive:          { type: Date, default: Date.now},
  displayname:         { type: String, default: '' },
  authority:           { type: String, required: true, enum: ['admin', 'staff-member', 'guest'] },
  boardRoles:          { type: Map, of: { type: ObjectId, ref: 'Role' } },
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
