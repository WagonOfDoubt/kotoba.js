import $ from 'jquery';
import 'jquery-serializejson';
import dialogPolyfill from 'dialog-polyfill';
import * as modal from './modal';
import escape from 'lodash.escape';
import truncate from 'lodash.truncate';
import { objectDiff } from './utils';


const serializeForm = (form) =>
  form.serializeJSON({checkboxUncheckedValue: "false"});


const alertErrorHandler = (data) => {
  console.error(data);
  const {status, statusText} = data;
  const errorText = `Something went wrong (${ status } ${ statusText })`;
  if (!data.responseJSON) {
    return modal.alert('Error', errorText);
  }
  const errors = data.responseJSON.errors;
  const errorsMsg = errors
    ? Object.values(errors)
      .map(error => error.msg)
      .join('<br>')
    : data.responseJSON.error || errorText;
  return modal.alert('Error', errorsMsg);
};


const sendJSON = (url, type, data) => {
  return new Promise((resolve, reject) => {
    modal.wait();
    $.ajax({
      url: url,
      type: type,
      data: JSON.stringify(data),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    })
      .done(resolve)
      .fail(reject);
  });
};


const createTable = (rows = [], head = []) => {
  const truncHTML = str => escape(truncate(str, { length: 100 }));
  const wrapInTags = (tag, str) => `<${ tag }>${ str }</${ tag }>`;
  const createCols = (cols, tdTag) => cols
    .map(col => wrapInTags(tdTag, truncHTML(col)))
    .join('');
  const createRows = (rows, tdTag) => rows
    .map(row => wrapInTags('tr', createCols(row, tdTag)))
    .join('');
  const createBody = (rows, bodyTag, tdTag) =>
    wrapInTags(bodyTag, createRows(rows, tdTag));

  const thead = createBody([head], 'thead', 'th');
  const tbody = createBody(rows, 'tbody', 'td');
  return $(`<table class="table">${ thead }${ tbody }</table>`);
};


const fetchChanges = ($form, populateContainer) => {
  const formData = serializeForm($form);
  populateContainer.text('Loading...');
  const getRoute = $form.attr('action');
  $.getJSON(getRoute)
    .done((data) => {
      const diff = objectDiff(formData, data);
      const table = createTable(
        Object.entries(diff)
          .map(([key, value]) => [key, value.old, value.new ]),
        ['property', 'current value', 'new value']
      );
      populateContainer.text('').append(table);
    })
    .fail((data) => {
      if (data.responseJSON) {
        const errors = data.responseJSON.errors;
        const errorsMsg = Object.values(errors)
          .map(error => error.msg)
          .join('<br>');
        populateContainer.html(errorsMsg);
      } else {
        populateContainer.text('Error ' + data.status);
      }
    });
};


const fetchPreivew = (url, data, populateContainer) => {
  populateContainer.text('Loading...');
  const onDone = (data, status) => {
    populateContainer.html(data);
  };
  $.ajax({
    url: url,
    type: 'POST',
    data: { data: data },
    dataType: 'text'
  })
    .done(onDone)
    .fail((data) => {
      if (data.responseJSON) {
        const errors = data.responseJSON.errors;
        const errorsMsg = Object.values(errors)
          .map(error => error.msg)
          .join('<br>');
        populateContainer.html(errorsMsg);
      } else {
        populateContainer.text('Error ' + data.status);
      }
    });
};


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
