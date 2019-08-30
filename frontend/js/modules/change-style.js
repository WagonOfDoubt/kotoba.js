import $ from 'jquery';


export const setStyle = (stylename) => {
  stylename = stylename || '';
  localStorage.setItem('kot_style', stylename);
  $('link[data-style]').each(function() {
      const { preffered, style } = this.dataset;
      this.disabled = true;
      this.disabled = !(stylename === style || (!style && preffered));
  });
};


export const getCurrentStyle = () => {
  return localStorage.getItem('kot_style');
};


export const initChangeStyle = () => {
  // on page load, update page style
  const currentStyle = localStorage.getItem('kot_style');
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
