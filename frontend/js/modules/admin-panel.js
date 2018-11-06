import $ from 'jquery';
import 'jquery-serializejson';
import * as modal from './modal';
import { serializeForm, alertErrorHandler, sendJSON, createTable, fetchChanges,
  fetchPreivew } from '../utils/api-utils';
import { closeAllVideos, minimizeAllImages } from './attachment-viewer';
import { selectTab } from './tabs';


const checkAdminForm = ($form) => {
  const postsSelected = !!$form.has('input[name="posts[]"]:checked').length;
  const threadsSelected = !!$form.has('.oppost input[name="posts[]"]:checked').length;
  const attachmentsSelected = !!$form.has('input[name="attachments[]"]:checked').length;
  const hasSelected = postsSelected || attachmentsSelected;
  const adminPanel = document.querySelector('.admin-panel');
  if (adminPanel) {
    adminPanel.classList.toggle('show', hasSelected);
    const postsTab = adminPanel.querySelector('.admin-panel__item_posts');
    const threadsTab = adminPanel.querySelector('.admin-panel__item_threads');
    const attachmentsTab = adminPanel.querySelector('.admin-panel__item_attachments');
    postsTab.classList.toggle('hidden', !postsSelected);
    threadsTab.classList.toggle('hidden', !threadsSelected);
    attachmentsTab.classList.toggle('hidden', !attachmentsSelected);
    if (attachmentsSelected) {
      selectTab('#admin-panel__tab_attachments')
    } else if (threadsSelected) {
      selectTab('#admin-panel__tab_threads');
    } else if (postsSelected) {
      selectTab('#admin-panel__tab_posts');
    }
  }
};


const sendSetFlagRequest = (url, data, setFlags) => {
  const { attachments } = data;
  data.set = setFlags;
  data.regenerate = true;
  console.log(data);
  modal.wait();
  sendJSON(url, 'patch', data)
    .then((response) => {
      console.log(response);
      modal
        .alert('Success', `Flags ${ JSON.stringify(setFlags) } has been set.`)
        .finally(() => window.location.reload());
    })
    .catch(alertErrorHandler);
};


function initAdminPanel() {
  const $form = $('.admin-form, #delform');

  const onSetFlagBtn = (url, e) => {
    e.preventDefault();
    const { name, value } = e.target;
    const setFlags = {};
    console.log(name, value, e.target);
    setFlags[name] = value === 'true';
    const data = $form.serializeJSON();
    sendSetFlagRequest(url, data, setFlags);
  };

  // add events
  $('.js-set-attachment-flag').on('click', (e) => onSetFlagBtn('/api/attachment', e));
  $('.js-set-post-flag').on('click', (e) => onSetFlagBtn('/api/post', e));
  $('.js-set-thread-flag').on('click', (e) => onSetFlagBtn('/api/post', e));

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
