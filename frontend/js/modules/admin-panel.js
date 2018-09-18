import $ from 'jquery';
import 'jquery-serializejson';
import * as modal from './modal';
import { serializeForm, alertErrorHandler, sendJSON, createTable, fetchChanges,
  fetchPreivew } from '../utils/api-utils';
import { closeAllVideos, minimizeAllImages } from './attachment-viewer';
import { selectTab } from './tabs';


const checkAdminForm = ($form) => {
  const postsSelected = !!$form.has('input[name="posts[]"]:checked').length;
  const attachmentsSelected = !!$form.has('input[name="attachments[]"]:checked').length;
  const hasSelected = postsSelected || attachmentsSelected;
  const adminPanel = document.querySelector('.admin-panel');
  if (adminPanel) {
    adminPanel.classList.toggle('show', hasSelected);
    const postsTab = adminPanel.querySelector('.admin-panel__item_posts');
    const attachmentsTab = adminPanel.querySelector('.admin-panel__item_attachments');
    postsTab.classList.toggle('hidden', !postsSelected);
    attachmentsTab.classList.toggle('hidden', !attachmentsSelected);
    if (attachmentsSelected) {
      selectTab('#admin-panel__tab_attachments')
    } else if (postsSelected) {
      selectTab('#admin-panel__tab_posts');
    }
  }
};


const sendSetFlagRequest = ($form, setFlags) => {
  const data = $form.serializeJSON();
  const { attachments } = data;
  data.set = setFlags;
  console.log(data);
  modal.wait();
  sendJSON('/api/attachment', 'patch', data)
    .then((response) => {
      modal
        .alert('Success', `Flags ${ JSON.stringify(setFlags) } has been set.`)
        .finally(() => window.location.reload());
    })
    .catch(alertErrorHandler);
};


function initAdminPanel() {
  const $form = $('.admin-form, #delform');

  // add events
  $('.js-set-attachment-flag').on('click', (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    const setFlags = {};
    console.log(name, value, e.target);
    setFlags[name] = value === 'true';
    sendSetFlagRequest($form, setFlags);
  });

  $('.js-select-all-items').on('click', (e) => {
    e.preventDefault();
    const { target } = e.target.dataset;
    $form
      .find(target)
      .prop('checked', true)
      .trigger('change');
  });

  $('.js-deselect-all-items').on('click', (e) => {
    e.preventDefault();
    const { target } = e.target.dataset;
    $form
      .find(target)
      .prop('checked', false)
      .trigger('change');
  });

  $('.js-select-post').on('change', (e) => {
    const input = e.target;
    const post = document.getElementById(input.value);
    post.classList.toggle('selected', input.checked);
    // when post selected, minimize all attachments
    minimizeAllImages(post);
    if (!post.classList.contains('selected')) {
      $(post).find('.js-select-attachment').prop('checked', false).change();
    }
    closeAllVideos(post);
    checkAdminForm($form);
  });

  $('.js-select-attachment').on('change', (e) => {
    const checkbox = e.target;
    const attachment = checkbox.closest('.attachment');
    if (attachment) {
      attachment.classList.toggle('selected', checkbox.checked);
    }
    checkAdminForm($form);
  });

  // initial set on page load
  const addClassToClosestParent = (sourceSelector, parentSelector, className) =>
    Array
      .from(document.querySelectorAll(sourceSelector))
      .map(checkbox => checkbox.closest(parentSelector))
      .filter(attachment => attachment)
      .map(attachment => attachment.classList.add(className));

  addClassToClosestParent('input[name="posts[]"]:checked', '.post', 'selected');
  addClassToClosestParent('input[name="attachments[]"]:checked', '.attachment', 'selected');
  checkAdminForm($form);
}

export { initAdminPanel };
