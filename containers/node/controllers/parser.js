const format = require('util').format;
const Post = require('../models/post');
const wakabamark = require('../parser.json');


const linkRegexps = [
  {
    regexp: /^((https?|area|ftp|irc)\:\/\/\S+)(  )?/i,
    pattern: '<a href="%s" rel="noreferrer" target="_blank">%s</a>',
    match: 0,
    href: 1,
    text: 1,
    protocol: 2
  },
  {
    regexp: /^(mailto\:([^"<>\s]+\@\S+))(  )?/i,
    pattern: '<a href="%s">%s</a>',
    match: 0,
    href: 1,
    text: 2
  }
];


const reflinks = [
  // >>123 links (replies)
  {
    regexp: /^>>(\d+)(?=\n)/i,
    newline: true,
    type: 'reply',
    relative: true,
    match: 0,
    post: 1
  },
  // >>123 links (references)
  {
    regexp: /^>>(\d+)(?=\s)/i,
    newline: false,
    type: 'reference',
    relative: true,
    match: 0,
    post: 1
  },
  // >>/b/123 links (reference)
  {
    regexp: /^>>\/(\w+)\/(\d+)(?=\s)/i,
    newline: false,
    type: 'reference',
    relative: false,
    match: 0,
    post: 2,
    board: 1
  },
  // >>>/b/ links (board)
  {
    regexp: /^>>>\/(\w+)\/(?=\s)/i,
    newline: false,
    type: 'board',
    relative: false,
    match: 0,
    board: 1
  }
];

class Parser {
  constructor(markup) {
    this.markup = markup;
  }

  async parseThreads(threads) {
    return await Promise.all(threads.map(this.parseThread));
  };

  async parseThread(thread) {
    const promises = [thread].concat(thread.children)
      .map((post) => this.parseBody(post.body, post.boardUri)
        .then(result => post.parsed = result));
    await Promise.all(promises);
    return thread;
  };

  async parsePost(post) {
    post.parsed = await this.parseBody(post.body, post.boardUri);
    return post;
  }

  async parseBody(text, board) {
    if (!text || !text.length) {
      return '';
    }
    // replace windows line-endings with unix
    text = text.replace(/\r\n/g, '\n');
    text = text.trim();
    text += '\n';

    let elements = Parser.append([], this.parseElement(text));
    elements = await this.resolveReflinks(elements, board);
    return elements;
  }

  async resolveReflinks(parseResult, board) {
    const reflinks = parseResult
      .filter((val) => typeof val === 'object' && val.post);
    const reflinksQuery = reflinks.map((val) => {
        return {
          postId: parseInt(val.post),
          boardUri: val.board || board
        };
      });
    if (reflinksQuery.length) {
      try {
        const results = await Post.findRefs(reflinksQuery).exec();
        reflinks.forEach((ref) => {
          ref.resolved = results.find((res) => {
            const sameBoard = (ref.board || board) === res.boardUri;
            const samePost = res.postId === parseInt(ref.post);
            return samePost && sameBoard;
          });
        });
      } catch (error) {
        throw error;
      }
    }
    return parseResult;
  }

  parseElement(text, d) {
    let elements = [];
    const nesting = !d || d.nesting;

    if (nesting) {
      let acc = '';
      let lineStart = !d || d.initiator.endsWith('\n');
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const tail = text.substr(i);

        const reflink = Parser.findReflink(tail, lineStart);
        if (reflink) {
          if (acc.length) {
            elements = Parser.append(elements, Parser.parseLinks(acc), false);
            acc = '';
          }
          elements = Parser.append(elements, reflink);
          i += reflink.match.length - 1;
          continue;
        }

        const directive = this.testInitiator(tail, lineStart);

        if (directive) {
          const tailAfterInitiator = tail.substr(directive.initiator.length);
          const terminatorIndex = this.findTerminator(tailAfterInitiator,
            directive.terminator, directive.multiline);
          if (terminatorIndex !== -1) {
            if (acc.length) {
              elements = Parser.append(elements, Parser.parseLinks(acc), false);
              acc = '';
            }
            const body = tailAfterInitiator.substring(0, terminatorIndex);
            elements = Parser.append(elements,
              this.parseElement(body, directive));
            const jump = directive.initiator.length +
              body.length +
              directive.terminator.length - 1;
            i += jump;
            lineStart = directive.terminator.endsWith('\n');
            continue;
          }
        }

        acc += char;
        lineStart = char === '\n';
      }

      if (acc.length) {
        elements = Parser.append(elements, Parser.parseLinks(acc), false);
      }
    } else {
      elements = Parser.append(elements, text);
    }

    if (d) {
      if (d.preserveInitiator && d.initiator) {
        elements = Parser.prepend(elements, d.initiator);
      }
      elements = Parser.prepend(elements, d.openTag, false);
      if (d.preserveTerminator && d.terminator) {
        elements = Parser.append(elements, d.terminator);
      }
      elements = Parser.append(elements, d.closeTag, false);
    }

    return elements;
  }

  testInitiator(tail, isNewline) {
    return this.markup.find((val) => {
      return (!val.newline || isNewline) &&
        val.initiator &&
        tail.startsWith(val.initiator);
    });
  }

  findTerminator(tail, terminator, multiline = false) {
    if (!tail || !terminator) {
      return -1;
    }
    const indexOfTerminator = tail.indexOf(terminator);
    if (indexOfTerminator === -1) {
      return -1;
    }
    if (multiline) {
      return indexOfTerminator;
    }
    const indexOfNewline = tail.indexOf('\n');
    if (indexOfNewline !== -1 && indexOfNewline < indexOfTerminator) {
      return -1;
    }
    return indexOfTerminator;
  }

  static append(element, item, safe = true) {
    if (safe && typeof item === 'string') {
      item = Parser.sanitize(item);
    }
    const push = typeof element[element.length - 1] !== 'string' ||
      typeof item !== 'string';
    if (push) {
      if (item instanceof Array) {
        element = element.concat(...item);
      } else {
        element.push(item);
      }
    } else {
      element[element.length - 1] += item;
    }
    return element;
  }

  static prepend(element, item, safe = true) {
    if (safe && typeof item === 'string') {
      item = Parser.sanitize(item);
    }
    const push = typeof element[0] !== 'string' ||
      typeof item !== 'string';
    if (push) {
      if (item instanceof Array) {
        element = item.concat(...element);
      } else {
        element.unshift(item);
      }
    } else {
      element[0] = item + element[0];
    }
    return element;
  }

  static sanitizeChar(char) {
    const entities = {
      '\n': '<br>',
      '>': '&gt;',
      '<': '&lt;',
      '&': '&amp;',
      '"': '&quot;',
      '\'': '&#39;'
    };
    return entities[char] || char;
  }

  static sanitize(text) {
    var acc = '';
    for (var i = 0; i < text.length; i++) {
      acc += Parser.sanitizeChar(text[i]);
    }
    return acc;
  }

  static parseLinks(text) {
    let acc = '';
    for (let i = 0; i < text.length; i++) {
      const tail = text.substr(i);
      const replaced = linkRegexps.find(linkreg => {
        const match = linkreg.regexp.exec(tail);
        if (match) {
          i += match[linkreg.match].length - 1;
          const encoded = encodeURI(decodeURI(match[linkreg.href]));
          const decoded = Parser.sanitize(decodeURI(match[linkreg.text]));
          acc += format(linkreg.pattern, encoded, decoded);
          return true;
        }
        return false;
      });
      if (!replaced) {
        const char = text[i];
        acc += Parser.sanitizeChar(char);
      }
    }
    return acc;
  }

  static findReflink(tail, isNewline) {
    let match;
    const reflink = reflinks.find(refreg => {
      if (refreg.newline && !isNewline) {
        return false;
      }
      match = refreg.regexp.exec(tail);
      return match;
    });
    if (reflink) {
      const unresolvedRef = {
        match: match[reflink.match],
        type: reflink.type
      };
      if ('board' in reflink) {
        unresolvedRef.board = match[reflink.board];
      }
      if ('post' in reflink) {
        unresolvedRef.post = match[reflink.post];
      }
      return unresolvedRef;
    }
    return null;
  }
}


module.exports = new Parser(wakabamark);
