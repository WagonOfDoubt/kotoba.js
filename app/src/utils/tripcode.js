/**
 * Module for tripcode parsing and encryption
 * @module utils/tripcode
 */
const crypt3 = require('unix-crypt-td-js');
const crypto = require('crypto');


/**
 * Perform the rot13 transform on a string
 * @see {@link https://www.php.net/manual/en/function.str-rot13.php}
 * @see {@link https://stackoverflow.com/a/26514148}
 * @param  {String} str The input string
 * @return {String}     The ROT13 version of the given string
 */
const rot13 = (str) => {
  return str.replace(/[a-zA-Z]/g, (a) => String.fromCharCode(
      ((a = a.charCodeAt()) < 91 ? 78 : 110) > a ? a + 13 : a - 13)
  );
};


/**
 * @typedef {Object} ParseTripResult
 * @property {?String} name Name
 * @property {?String} trip1 Regular tripcode
 * @property {?String} trip2 Secure tripcode
 * @property {?String} marker1 Character before regular tripcode ("!" or "#")
 * @property {?String} marker2 Character before secure tripcode ("!" or "#")
 */

/**
 * Splits input name string with or without tripcode into name part and
 *    tripcode parts
 * @param  {String} nameStr Input name. Can be in formats:
 *  - "name"
 *  - "name!trip"
 *  - "name#trip"
 *  - "name!trip!securetrip"
 *  - "name#trip#securetrip"
 * @return {ParseTripResult} Object with fields "name", "trip1", "trip2"
 */
const parseTrip = (nameStr) => {
  const reNameTrip = /^(?<name>.*?)(?<marker1>#|!)(?<trip1>.*?)(?:(?<marker2>#|!)(?<trip2>.*?))?$/i;
  const matches = nameStr.match(reNameTrip);
  if (!matches) {
    return null;
  }
  return matches.groups;
};


/**
 * @typedef {Object} NameAndTrip
 * @property {?String} name Name (i.e. "Moot")
 * @property {?String} tripcode Tripcode string (i.e. "!Ep8pui8Vw2")
 */


/**
 * Parse input name, split it into name and tripcode parts and encrypt tripcode
 * @param  {String} nameStr Input name
 * @return {NameAndTrip} Object with fields "name" and "tripcode"
 * @alias module:utils/tripcode
 */
const detectTrip = (nameStr) => {
  const parsed = parseTrip(nameStr);
  if (!parsed) {
    return '';
  }
  const { name, trip1, trip2 } = parsed;
  let normalTripcode = '';
  if (trip1) {
    const salt = (trip1 + 'H..').substr(1, 2);
    normalTripcode = crypt3(trip1, salt).substr(-10);
  }
  let secureTripcode = '';
  if (trip2) {
    secureTripcode = crypto
      .createHash('md5')
      .update(trip2)
      .update(process.env.RANDOM_SEED)
      .digest('hex');
    secureTripcode = Buffer.from(secureTripcode).toString('base64');
    secureTripcode = rot13(secureTripcode);
    secureTripcode = secureTripcode.substr(2, 10);
  }
  const tripcode = secureTripcode ?
    `!${normalTripcode}!!${secureTripcode}` :
    `!${normalTripcode}`;
  return { name, tripcode };
};


module.exports = detectTrip;
