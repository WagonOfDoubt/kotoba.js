/**
 * Spoilers and other show-able/hide-able content
 * @module modules/toggle-visibility
 */

import $ from 'jquery';

/**
 * Initialize module
 */
export const initToggleVisibility = () => {
  $('body').on('click', '.js-toggle-visibility', e => {
    const btn = e.currentTarget;
    const isVisible = btn.dataset.visible === 'false';
    if (isVisible && btn.dataset.group) {
      $(btn.dataset.group).each((i, el) => {
        el.dataset.visible = 'false';
      });
    }
    btn.dataset.visible = isVisible ? 'true' : 'false';
    if (btn.dataset.captionHide && isVisible) {
      btn.innerHTML = btn.dataset.captionHide;
    }
    if (btn.dataset.captionShow && !isVisible) {
      btn.innerHTML = btn.dataset.captionShow;
    }
    if (btn.dataset.target) {
      $(btn.dataset.target).toggleClass('hidden', !isVisible);
    }
    if (isVisible && btn.dataset.hide) {
      $(btn.dataset.hide).toggleClass('hidden', true);
    }
    if (isVisible && btn.dataset.show) {
      $(btn.dataset.show).toggleClass('hidden', false);
    }
    e.preventDefault();
  });
};
