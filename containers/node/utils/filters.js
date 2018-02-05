const path = require('path');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({ html: true });

const filters = {};

filters.markdown = (text, options) => {
  return md.render(text);
};


const evalPath = (o, x) =>
  (typeof o == 'undefined' || o === null) ? o : o[x];

filters.getPath = (key, obj) => {
  return obj && key.split('.').reduce(evalPath, obj);
};

filters.getParam = (key, obj) => {
  return obj && key
    .split('[')
    .map(key => key.replace(/\]/g, ''))
    .reduce(evalPath, obj);
};


filters.readableSize = (text, options) => {
  const bytes = parseInt(text);
  const prefixes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  let size = bytes;
  let prefixIndex = 0;
  for (; prefixIndex < prefixes.length; prefixIndex++) {
    if (size < 1024) {
      break;
    }
    size = size / 1024;
  }
  return size.toFixed(2) + ' ' + prefixes[prefixIndex];
};


filters.readableDuration = (text, options) => {
  const milliseconds = parseInt(text);
  const date = new Date(milliseconds);
  let seconds = Math.floor((milliseconds / 1000) % 60);
  let minutes = Math.floor((milliseconds / 60000) % 60);
  const hours = Math.floor((milliseconds / 3600000) % 24);
  if (seconds < 10) {
    seconds = '0' + seconds;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  let result = `${ minutes }:${ seconds }`;
  if (hours > 0) {
    result = hours + ':' + result;
  }
  return result;
};


filters.shortFileName = (text, {length, placeholder}) => {
  const ext = path.extname(text);
  const name = path.basename(text, ext);
  if (name.length <= length) {
    return filters.escape(name) + ext;
  }
  return filters.escape(name.substring(0, length)) + placeholder + ext;
};

filters.escape = (text, options) => {
  const entities = {
    '\n': '<br>',
    '>': '&gt;',
    '<': '&lt;',
    '&': '&amp;',
    '"': '&quot;',
    '\'': '&#39;'
  };
  let acc = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    acc += entities[char] || char;
  }
  return acc;
};


filters.encodeUri = (text) => encodeURI(decodeURI(text));


module.exports = filters;
