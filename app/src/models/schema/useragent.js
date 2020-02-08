/**
 * Useragent schema, provides useful parsed useragent data, does not have a
 * collection on it's own
 * @module models/schema/useragent
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * @typedef {Object} Useragent
 * @property {String} os Operating system: "Windows 7", "Linux 64", etc.
 * @property {String} platform Platform: "Microsoft Windows", "Linux", etc.
 * @property {String} browser Browser: "Chrome", "Firefox", etc.
 * @property {String} version Browser version
 * @property {String} source Original useragent: "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.79..."
 * @property {Boolean} isBot Is client bot
 * @property {Boolean} isMobile Is client on mobile
 * @property {Boolean} isDesktop Is client on desktop
 * @public
 */
module.exports = Schema({
  os:                  { type: String, required: true },
  platform:            { type: String, required: true },
  browser:             { type: String, required: true },
  version:             { type: String, required: true },
  source:              { type: String, required: true },
  isBot:               { type: Boolean, required: true },
  isMobile:            { type: Boolean, required: true },
  isDesktop:           { type: Boolean, required: true },
},
// options
{
  strict: true,
  minimize: true,
  _id: false,
});
