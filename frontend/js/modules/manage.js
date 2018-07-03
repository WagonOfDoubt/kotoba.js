import $ from 'jquery';
import * as modal from './modal';
import { serializeForm, alertErrorHandler, sendJSON, createTable, fetchChanges,
  fetchPreivew } from '../utils/api-utils';

const initPreviewBtns = () => {
  $('button[data-action="preview-markdown"]')
    .click(e => {
      const btn = e.currentTarget;
      const { action, field } = btn.dataset;
      const containerId = action + '-' + field;
      const fieldValue = $(`#${ field }`).val();
      const modalBody = `<div id="${ containerId }"></div>`;
      modal.alert('Preview', modalBody);
      fetchPreivew('/preview/markdown', fieldValue, $(`#${ containerId }`));
    });
};


const managePage_addBoard = () => {
  const $form = $('#form-update-board');
  const action = $form.attr('action');
  const method = $form.data('method');
  $form.submit((e) => {
    const { uri, name } = serializeForm($form);
    const modalBody = `
      <p>Following board will be created:</p>
      <p>/${ uri }/ - ${ name }</p>`;
    modal
      .confirmPrompt('Create board', modalBody, 'Create board')
      .then(({ formData }) => {
        sendJSON(action, method, Object.assign({ data: serializeForm($form) }, formData))
          .then(() => {
            modal
              .dialogPromise(document.getElementById('dialog-update-board-success'))
              .finally(() => window.location.href = '/' + uri);
          })
          .catch(alertErrorHandler);
      });
    e.preventDefault();
  });
};


const managePage_updateBoard = () => {
  const $form = $('#form-update-board');
  const action = $form.attr('action');
  const method = $form.data('method');
  $form.submit((e) => {
    modal
      .dialogPromise(document.getElementById('dialog-update-board'), ['ok'])
      .then(({ formData }) => {
        sendJSON(action, method, Object.assign({ data: serializeForm($form) }, formData))
          .then(() => {
            modal
              .dialogPromise(document.getElementById('dialog-update-board-success'))
              .finally(() => window.location.href = '/manage/boardopts/');
          })
          .catch(alertErrorHandler);
      });
    fetchChanges($form, $('#dialog-update-board .changes-list'));
    e.preventDefault();
  });
};


const managePage_deleteBoard = () => {
  const $form = $('#form-delete-board');
  const action = $form.attr('action');
  const method = $form.data('method');
  $form.submit((e) => {
    const formData = serializeForm($form);
    if (formData.board !== formData.uri) {
      modal
        .alert('Error', 'You must specify the board');
    } else {
      modal
        .dialogPromise(document.getElementById('dialog-delete-board-confirm'), ['ok'])
        .then(() => {  // user clicked Ok
          sendJSON(action, method, formData)
            .then(() => {
              modal
                .dialogPromise(document.getElementById('dialog-delete-board-success'))
                .finally(() => window.location.href = '/manage/boardopts');
            })
            .catch(alertErrorHandler);
        });
    }
    e.preventDefault();
  });
};


const managePage_siteSettings = () => {
  const $form = $('#form-update-sitesettings');
  const action = $form.attr('action');
  const method = $form.data('method');
  $form.submit((e) => {
    modal
      .dialogPromise(document.getElementById('dialog-update-settings'), ['ok'])
      .then(({ formData }) => {
        sendJSON(action, method, Object.assign({ data: serializeForm($form) }, formData))
          .then(() => {
            modal
              .dialogPromise(document.getElementById('dialog-update-settings-success'))
              .finally(() => window.location.href = '/manage/');
          })
          .catch(alertErrorHandler);
      });
    fetchChanges($form, $('#dialog-update-settings .changes-list'));
    e.preventDefault();
  });
};


const mangePage_news = () => {
  $('button[data-action="edit"]').click(e => {
    const btn = e.currentTarget;
    const newsId = parseInt(btn.dataset.news);
    window.location = `/manage/news/${ newsId }`;
  });

  $('button[data-action="delete"]').click(e => {
    const btn = e.currentTarget;
    const newsId = btn.dataset.news;
    const deleteDialog = document.getElementById('dialog-delete-news');
    modal
      .dialogPromise(deleteDialog, ['ok'])
      .then(({ formData }) => {
        sendJSON('/api/news/' + newsId, 'DELETE', formData)
          .then(() => {
            modal
              .alert('Success', 'News entry was deleted')
              .finally(() => window.location = '/manage/news');
          })
          .catch(alertErrorHandler);
      });
  });

  const $form = $('#form-edit-news');
  const action = $form.attr('action');
  const method = $form.data('method');
  $form.submit((e) => {
    const newsFormData = serializeForm($form);
    modal
      .dialogPromise(document.getElementById('dialog-news-confirm'), ['ok'])
      .then(({ formData }) => {
        sendJSON(action, method, Object.assign({ data: newsFormData }, formData))
          .then(() => {
            modal
              .dialogPromise(document.getElementById('dialog-news-success'))
              .finally(() => window.location = '/manage/news');
          })
          .catch(alertErrorHandler);
      });
    fetchPreivew('/preview/news', newsFormData, $('#dialog-news-confirm .news-preview'));
    e.preventDefault();
  });
};


const addSubmitListener = ($form, callback) => {
  $form.submit((e) => {
    const $form = $(e.target);
    const method = $form.data('method');
    const action = $form.attr('action');
    sendJSON(action, method, serializeForm($form))
      .then((data) => callback(data))
      .catch(alertErrorHandler);
    e.preventDefault();
  });
};


const managePage_maintenance = () => {
  const onDone = (data) => {
    const took = data.took;
    const message = `Rebuild complete. Took <strong>${ took }</strong> seconds.`;
    modal.alert('Success', message);
  };
  addSubmitListener($('#form-regenerate-all'), onDone);
};


const managePage_profile = () => {
  const onUserUpdated = () => {
    modal.alert('Success', 'Profile updated');
  };
  const onPasswordChanged = () => {
    modal.alert('Success', 'Passord successfully changed');
  };
  addSubmitListener($('#form-update-user'), onUserUpdated);
  addSubmitListener($('#form-change-password'), onPasswordChanged);

  const $form = $('#form-delete-account');
  const method = $form.data('method');
  const action = $form.attr('action');
  const confirmDialog = document.querySelector($form.data('confirm'));
  const successDialog = document.querySelector($form.data('success'));
  $form.submit((e) => {
    modal
      .dialogPromise(confirmDialog)
      .then(({ formData }) => {
        sendJSON(action, method, Object.assign({ data: serializeForm($form) }, formData))
          .then(() => {
            modal
              .dialogPromise(successDialog)
              .then(() => window.location.href = '/');
          })
          .catch(alertErrorHandler);
      });
    e.preventDefault();
  });
};


export const init = () => {
  const body = document.body;
  if (!body.classList.contains('manage-page')) {
    return;
  }
  initPreviewBtns();
  modal.init();

  const activities = {
    'manage-page-addboard': managePage_addBoard,
    'manage-page-delboard': managePage_deleteBoard,
    'manage-page-boardopts': managePage_updateBoard,
    'manage-page-sitesettings': managePage_siteSettings,
    'manage-page-addnews': mangePage_news,
    'manage-page-editnews': mangePage_news,
    'manage-page-maintenance': managePage_maintenance,
    'manage-page-profile': managePage_profile,
  };
  const currentActivity = Object
    .keys(activities)
    .find((key) => body.classList.contains(key));
  if (currentActivity) {
    activities[currentActivity].call();
  }
}
