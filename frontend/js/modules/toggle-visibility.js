import $ from 'jquery';

export const initToggleVisibility = () => {
  $('body').on('click', '.js-toggle-visibility', e => {
    const btn = e.currentTarget;
    btn.dataset.visible = btn.dataset.visible === 'true' ? 'false' : 'true';
    btn.innerHTML = btn.dataset.visible === 'true' ? 'hide' : 'show';
    $(btn.dataset.target).toggleClass('hidden', btn.dataset.visible !== 'true');
    e.preventDefault();
  });
};
