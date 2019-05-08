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


export const initChangeStyle = () => {
  // on page load, update page style
  const currentStyle = localStorage.getItem('kot_style');
  if (currentStyle) {
    setStyle(currentStyle);
  }
  // listener to style change buttons
  $('body').on('click', '.js-set-style', (e) => {
    const { style } = e.target.dataset;
    setStyle(style);
    e.preventDefault();
  });
};
