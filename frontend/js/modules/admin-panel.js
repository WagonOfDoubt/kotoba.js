import $ from 'jquery';
import 'jquery-serializejson';
import * as modal from './modal';
import { serializeForm, alertErrorHandler, sendJSON, createTable, fetchChanges,
  fetchPreivew } from '../utils/api-utils';
import { closeAllVideos, minimizeAllImages } from './attachment-viewer';


const checkAdminForm = ($form) => {
  const itemsSelected = $form.has('.admin-form-checkbox:checked').length;
  const hasSelected = !!itemsSelected;
  const $adminPanel = $form.find('.admin-panel');
  console.log(itemsSelected, hasSelected, $adminPanel);
  $('body').toggleClass('show-admin-panel', hasSelected);

};


const sendSetFlagRequest = ($form, setFlags) => {
  const data = $form.serializeJSON();
  const { attachments } = data;
  data.set = setFlags;
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
  $('.admin-form, #delform')
    .on('change input', (e) => {
      checkAdminForm($form);
      e.preventDefault();
    });

  $('.js-set-attachment-flag').on('click', (e) => {
    e.preventDefault();
    const { name, value } = e.target.attributes;
    const setFlags = {};
    setFlags[name] = value === 'true';
    sendSetFlagRequest($form, setFlags);
  });

  $('.js-select-all-items').on('click', (e) => {
    e.preventDefault();
    $form.find('.admin-form-checkbox').prop('checked', true);
    checkAdminForm($form);
  });

  $('.js-deselect-all-items').on('click', (e) => {
    e.preventDefault();
    $form.find('.admin-form-checkbox').prop('checked', false);
    checkAdminForm($form);
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
  });

  $('.js-select-attachment').on('change', (e) => {
    const checkbox = e.target;
    const attachment = checkbox.closest('.attachment');
    if (attachment) {
      attachment.classList.toggle('selected', checkbox.checked);
    }
  });

  // initial set on page load
  const addClassToClosestParent = (sourceSelector, parentSelector, className) =>
    Array
      .from(document.querySelectorAll(sourceSelector))
      .map(checkbox => checkbox.closest(parentSelector))
      .filter(attachment => attachment)
      .map(attachment => attachment.classList.add(className));

  addClassToClosestParent('.js-select-post:checked', '.post', 'selected');
  addClassToClosestParent('.js-select-attachment:checked', '.attachment', 'selected');
  checkAdminForm($form);
}

export { initAdminPanel };
