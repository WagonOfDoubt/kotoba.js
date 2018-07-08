import $ from 'jquery';
import 'jquery-serializejson';
import * as modal from './modal';
import { serializeForm, alertErrorHandler, sendJSON, createTable, fetchChanges,
  fetchPreivew } from '../utils/api-utils';


const checkAdminForm = ($form) => {
  const itemsSelected = $form.has('.admin-form-checkbox:checked').length;
  const hasSelected = !!itemsSelected;
  const $adminPanel = $form.find('.admin-panel');
  $('body').toggleClass('show-admin-panel', hasSelected);

};


const sendSetFlagRequest = (setFlags) => {
  const $form = $('.admin-form');
  const data = $form.serializeJSON();
  const { attachments } = data;
  data.set = setFlags;
  modal.wait();
  console.log(data);
  sendJSON($form.attr('action'), $form.data('method'), data)
    .then((response) => {
      modal
        .alert('Success', `Flags ${ JSON.stringify(setFlags) } has been set.`)
        .finally(() => window.location.reload());
    })
    .catch(alertErrorHandler);
};


function initAdminPanel() {
  $('body')
    .on('change input', '.admin-form .admin-form-checkbox', (e) => {
      const $input = $(e.currentTarget);
      const $form = $input.closest('.admin-form');
      checkAdminForm($form);
      e.preventDefault();
    });

  const $form = $('.admin-form');
  checkAdminForm($form);
  $('.js-set-attachment-flag').on('click', (e) => {
    const name = $(e.target).attr('name');
    const value = $(e.target).attr('value');
    const setFlags = {};
    setFlags[name] = value === 'true';
    sendSetFlagRequest(setFlags);
    e.preventDefault();
  });
}

export { initAdminPanel };
