import $ from 'jquery';


export const applyStyle = (styleData) => {
  const el = document.getElementById('user-style');
  el.innerHTML = styleData.rawCSS;
  el.dataset.style = styleData.name;
};


const fetchStyle = (stylename) => {
  return fetch(`/api/style?filter=name:"${stylename}"&select=name updatedAt rawCSS&limit=1`)
    .then(res => {
      return res
        .json()
        .then((data) => {
          if (res.ok) {
            return data;
          } else {
            throw data;
          }
        });
    });
};

const checkStylesForUpdates = () => {
  const myStyles = getStoredStyles().styles;
  if (!myStyles) {
    return;
  }
  const currentStyles = Array.from(document.head.querySelectorAll('link[data-style]'))
    .map((linkEl) => {
      const {style, updatedAt} = linkEl.dataset;
      return {
        name: style,
        updatedAt: updatedAt
      };
    });
  const needsUpdate = currentStyles.filter((pageStyle) => {
    const myStyle = myStyles[pageStyle.name];
    if (!myStyle) {
      return false;
    }
    if (myStyle.updatedAt === pageStyle.updatedAt) {
      return false;
    }
    return Date.parse(myStyle.updatedAt) < Date.parse(pageStyle.updatedAt);
  });
  if (!needsUpdate.length) {
    return;
  }
  console.log(`${needsUpdate.length} styles need update`);
  const promises = needsUpdate.map(style => fetchStyle(style.name));
  Promise.all(promises)
    .then(data => {
      const stylecfg = getStoredStyles();
      for (const style of data) {
        stylecfg.styles[style.name] = style;
        if (style.name === getCurrentStyleName()) {
          applyStyle(style);
        }
      }
      setStoredStyles(stylecfg);
      console.log(`Styles ${data.map(s => s.name).join(', ')} are now up to date`);
    })
    .catch(error => {
      console.warn(`Error while loading styles:`, error);
    });
};


const getDefaultStyle = (scope = 'board') => {
  return document.head
    .querySelector(`link[data-style][data-${scope}-default]`)
    .dataset.style;
};


const getCurrentBoard = () => document.documentElement.dataset.board;


const setStyle = (stylename = '', scope = 'board') => {
  const stylecfg = getStoredStyles();
  const board = getCurrentBoard();
  if (stylecfg) {
    if (board && scope === 'board') {
      stylecfg.boards = stylecfg.boards || {};
      stylecfg.boards[board] = stylename;
      if (stylename === '') {
        delete stylecfg.boards[board];
      }
    } else {
      stylecfg.global = stylename;
      if (stylename === '') {
        delete stylecfg.global;
      }
    }
  }
  stylecfg.styles = stylecfg.styles || {};
  if (stylename === '') {
    stylename = getDefaultStyle();
  }
  if (!stylecfg.styles[stylename]) {
    fetchStyle(stylename)
      .then(data => {
        stylecfg.styles[stylename] = data;
        if (board && scope === 'board' || !board && scope === 'global') {
          applyStyle(stylecfg.styles[stylename]);
        }
        setStoredStyles(stylecfg);
        updateStyleInputs();
      })
      .catch(error => {
        console.warn(`Error while loading style "${stylename}":`, error);
      });
  } else {
    if (board && scope === 'board' || !board && scope === 'global') {
      applyStyle(stylecfg.styles[stylename]);
    }
    setStoredStyles(stylecfg);
    updateStyleInputs();
  }
};


const getCurrentStyleName = () => {
  const stylecfg = getStoredStyles();
  const board = getCurrentBoard();
  if (board) {
    if (stylecfg.boards && stylecfg.boards[board]) {
      return stylecfg.boards[board];
    }
    return getDefaultStyle('board');
  }
  if (stylecfg.global) {
    return stylecfg.global;
  }
  return getDefaultStyle('global');
};


const getGlobalStyleName = () => {
  const stylecfg = getStoredStyles();
  if (stylecfg.global) {
    return stylecfg.global;
  }
  return getDefaultStyle('global');
};


const getBoardStyleName = () => {
  const stylecfg = getStoredStyles();
  const board = getCurrentBoard();
  if (board && stylecfg.boards && stylecfg.boards[board]) {
    return stylecfg.boards[board];
  }
  return getDefaultStyle('board');
};


const getStoredStyles = () => {
  try {
    const stored = localStorage.getItem('kot_style');
    const parsed = JSON.parse(stored);
    if (!!parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (err) {
    return {};
  }
  return {};
};


const setStoredStyles = (stylecfg) => {
  localStorage.setItem('kot_style', JSON.stringify(stylecfg));
};


const updateStyleInputs = () => {
  const boardStyle = getBoardStyleName();
  if (boardStyle) {
    $(`.style-select[data-scope="board"] option[value=${boardStyle}]`)
      .prop('selected', true);
  }
  const globalStyle = getGlobalStyleName();
  if (globalStyle) {
    $(`.style-select[data-scope="global"] option[value=${globalStyle}]`)
      .prop('selected', true);    
  }
};


export const initChangeStyle = () => {
  // on page load, update page style
  const currentStyle = getCurrentStyleName();
  if (currentStyle) {
    setStyle(currentStyle);
  }
  updateStyleInputs();
  checkStylesForUpdates();
  // listener to style change buttons or combo boxes
  $('body').on('click', '.js-set-style', (e) => {
    e.preventDefault();
    const el = e.currentTarget;
    const style = el.dataset.style || el.value;
    const scope = el.dataset.scope;
    setStyle(style, scope);
  });
};
