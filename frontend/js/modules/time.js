/**
 * Time conversion and formatting
 * @module modules/time
 */

import $ from 'jquery';

const getLocaleDateTime = datetime =>
  (new Date(datetime)).toLocaleString();

const getLocaleDate = datetime =>
  (new Date(datetime)).toLocaleDateString();

const getLocaleTime = datetime =>
  (new Date(datetime)).toLocaleTimeString();

/**
 * Convert all time on page to local time with locale formatting
 */
export const localizeTime = (container) => {
  $('time.time', container)
    .each((i, el) => $(el).text(getLocaleTime(el.dateTime)));
  $('time.date', container)
    .each((i, el) => $(el).text(getLocaleDate(el.dateTime)));
  $('time.datetime', container)
    .each((i, el) => $(el).text(getLocaleDateTime(el.dateTime)));
};
