import $ from 'jquery';


export const applyStyle = (styleData) => {
  const el = document.getElementById('user-style');
  el.innerHTML = styleData.rawCSS;
  el.dataset.style = styleData.name;
};


const fetchStyle = (stylename) => {
  return fetch(`/api/style?name=${stylename}`)
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


const setStyle = (stylename = '') => {
  const stylecfg = getStoredStyles();
  const board = document.documentElement.dataset.board;
  if (stylecfg) {
    if (board) {
      stylecfg.boards = stylecfg.boards || {};
      stylecfg.boards[board] = stylename;
    } else {
      stylecfg.global = stylename;
    }    
  }
  stylecfg.styles = stylecfg.styles || {};
  if (!stylecfg.styles[stylename]) {
    fetchStyle(stylename)
      .then(data => {
        stylecfg.styles[stylename] = data;
        applyStyle(stylecfg.styles[stylename]);
        setStoredStyles(stylecfg);
      })
      .catch(error => {
        console.warn(`Error while loading style "${stylename}":`, error);
      });
  } else {
    applyStyle(stylecfg.styles[stylename]);
    setStoredStyles(stylecfg);
  }
};


const getCurrentStyleName = () => {
  const stylecfg = getStoredStyles();
  const board = document.documentElement.dataset.board;
  if (board && stylecfg.boards) {
    return stylecfg.boards[board];
  }
  if (stylecfg.global) {
    return stylecfg.global;
  }
  return '';
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


export const initChangeStyle = () => {
  // on page load, update page style
  const currentStyle = getCurrentStyleName();
  if (currentStyle) {
    setStyle(currentStyle);
    $(`.style-select option[value=${currentStyle}]`).prop('selected', true);
  }
  // listener to style change buttons
  $('body').on('click', 'a.js-set-style', (e) => {
    const style = e.target.dataset.style;
    setStyle(style);
    e.preventDefault();
  });
  // listener to style change combo box
  $('body').on('change', 'select.js-set-style', (e) => {
    const style = e.target[e.target.selectedIndex].value;
    setStyle(style);
    e.preventDefault();
  });
};
