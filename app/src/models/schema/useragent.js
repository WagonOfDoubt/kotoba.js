/**
 * Useragent schema, provides useful parsed useragent data, does not have a
 * collection on it's own
 * @module models/schema/useragent
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


module.exports = Schema({
  /**  Operating system: "Windows 7", "Linux 64", etc. */
  os:                  { type: String, required: true },
  /**  Platform: "Microsoft Windows", "Linux", etc. */
  platform:            { type: String, required: true },
  /**  Browser: "Chrome", "Firefox", etc. */
  browser:             { type: String, required: true },
  /**  Browser version */
  version:             { type: String, required: true },
  /**  Original useragent: "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.79..." */
  source:              { type: String, required: true },
  /** Is client bot */
  isBot:               { type: Boolean, required: true },
  /** Is client on mobile */
  isMobile:            { type: Boolean, required: true },
  /** Is client on desktop */
  isDesktop:           { type: Boolean, required: true },
},
// options
{
  strict: true,
  minimize: true,
});
