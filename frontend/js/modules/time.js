import $ from 'jquery';

const isoDateToLocal = datetime =>
  (new Date(datetime)).toLocaleString();

const localizeTimeTag = (el) =>
  $(el).text(isoDateToLocal(el.dateTime));

export const localizeTime = (container) => {
  $('time', container)
    .each((i, el) =>
      localizeTimeTag(el));
};
