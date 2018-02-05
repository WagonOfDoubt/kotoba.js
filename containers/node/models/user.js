const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

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
  password:            { type: String, required: true },
  addedon:             { type: Date, default: Date.now},
  lastactive:          { type: Date, default: Date.now},
  displayname:         { type: String, default: '' },
  authority:           { type: String, required: true },
  boards:              [ boardPermissionsSchema ],
  settings:            { type: String }
});

userSchema.methods.validPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};


const User = module.exports = mongoose.model('User', userSchema);
