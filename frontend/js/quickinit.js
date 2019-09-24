const getCurrentStyleName = (stylecfg) => {
  const board = document.documentElement.dataset.board;
  if (board && stylecfg.boards) {
    return stylecfg.boards[board];
  }
  if (stylecfg.global) {
    return stylecfg.global;
  }
  return '';
};


const applyStyle = (styleData) => {
  const el = document.getElementById('user-style');
  el.innerHTML = styleData.rawCSS;
  el.dataset.style = styleData.name;
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


const initPage = () => {
  const stylecfg = getStoredStyles();
  const styleName = getCurrentStyleName(stylecfg);
  if (styleName) {
    if (!stylecfg.styles) {
      return;
    }
    const styleData = stylecfg.styles[styleName];
    if (!styleData) {
      return;
    }
    applyStyle(styleData);
  }
};


initPage();
