import $ from 'jquery';
import 'jquery-serializejson';
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
    modal.alert('Error', errorText);
    return;
  }
  const errors = data.responseJSON.errors;
  const errorsMsg = errors
    ? Object.values(errors)
      .map(error => error.msg)
      .join('<br>')
    : data.responseJSON.error || errorText;
  modal.alert('Error', errorsMsg);
};


const sendJSON = (url, type, data, callback) => {
  $.ajax({
    url: url,
    type: type,
    data: JSON.stringify(data),
    contentType: 'application/json; charset=utf-8',
    dataType: 'json'
  })
    .done(callback)
    .fail(alertErrorHandler);
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


const fetchChanges = (form, populateContainer) => {
  const formData = serializeForm(form);
  populateContainer.text('Loading...');
  const getRoute = form.attr('action');
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
      modal
        .alert('Preview', modalBody)
        .then(() => {
          fetchPreivew('/preview/markdown', fieldValue, $(`#${ containerId }`));
        });
    });
};


const managePage_addBoard = () => {
  const form = $('#form-update-board');

  const onDone = (data, status) =>
    modal.alert('Success', 'Board was created', () => {
      window.location.href = '/' + data.data.uri;
    });

  const sendData = (e) => {
    modal.wait();
    sendJSON('/api/board/', 'PUT', { data: serializeForm(form) }, onDone);
  };

  form.submit((e) => {
    const formData = serializeForm(form);
    const boardname = `/${formData.uri}/ - ${formData.name}`;
    const modalBody = `
      <p>Following board will be created:</p>
      <p>${ boardname }</p>
    `;
    modal.promptWithCancelBtn('Create board', modalBody, [{
      label: 'Create board',
      action: 'dismiss',
      callback: sendData
    }]);
    e.preventDefault();
  });
};


const managePage_deleteBoard = () => {
  const currentBoard = document.location.pathname.split('/').pop();
  const form = $('#form-delete-board');
  const modalBody = `
    <p>Board /${ currentBoard }/ will be premanently deleted</p>`;

  const onDone = (data, status) =>
    modal.alert('Success', 'Board was deleted', () => {
      window.location.href = '/manage/boardopts';
    });

  const sendData = () => {
    modal.wait();
    sendJSON('/api/board/', 'DELETE', { uri: currentBoard }, onDone);
  };

  form.submit((e) => {
    const formData = serializeForm(form);
    const allChecked = Object.values(formData.check).every(val => val);
    if (formData.board !== currentBoard) {
      modal.alert('Error', 'You must specify the board');
    } else if (!allChecked) {
      modal.alert('Error', 'You must check all checkboxes');
    } else {
      modal.promptWithCancelBtn('Confirm board deletion', modalBody, [{
        label: 'Delete board',
        action: 'dismiss',
        callback: sendData
      }]);
    }
    e.preventDefault();
  });
};


const managePage_updateBoard = () => {
  const form = $('#form-update-board');
  const modalBody = `
    <p>Following options will be changed:</p>
    <div id="dialog-update-board-changes-list"></div>
    <label>
      <input type="checkbox" id="checkbox-board-regenerate"> Regenerate board
    </label>
  `;

  const onDone = (data, status) =>
    modal.alert('Success', 'Board options was updated');

  const sendData = () => {
    const data = {
      data: serializeForm(form),
      regenerate: $('#checkbox-board-regenerate').prop('checked')
    };

    modal.wait();
    sendJSON(form.attr('action'), 'PATCH', data, onDone);
  };

  form.submit((e) => {
    modal.promptWithCancelBtn('Update board options', modalBody, [{
        label: 'Save changes',
        action: 'dismiss',
        callback: sendData
      }])
      .then(() =>
        fetchChanges(form, $('#dialog-update-board-changes-list')));

    e.preventDefault();
  });
};


const managePage_siteSettings = () => {
  const form = $('#form-update-sitesettings');
  const modalBody = `
    <p>Following settings will be changed:</p>
    <div id="dialog-update-settings-changes-list"></div>
    <label>
      <input type="checkbox" checked id="checkbox-main-regenerate"> Regenerate main page
    </label>
  `;

  const onDone = (data, status) =>
    modal.alert('Success', 'Settings was updated');

  const sendData = () => {
    const data = {
      data: serializeForm(form),
      regenerate: $('#checkbox-main-regenerate').prop('checked')
    };

    modal.wait();
    sendJSON(form.attr('action'), 'PATCH', data, onDone);
  };

  form.submit((e) => {
    modal.promptWithCancelBtn('Update settings', modalBody, [{
        label: 'Save changes',
        action: 'dismiss',
        callback: sendData
      }])
      .then(() =>
        fetchChanges(form, $('#dialog-update-settings-changes-list')));

    e.preventDefault();
  });
};


const mangePage_news = () => {
  const modalBody = `
    <p>Are you sure want to delete this entry?</p>
    <label>
      <input type="checkbox" checked id="checkbox-main-regenerate"> Regenerate main page
    </label>`;

  const deleteNews = (newsId) => {
    modal.wait();
    const data = {
      regenerate: $('#checkbox-main-regenerate').prop('checked')
    };
    sendJSON('/api/news/' + newsId, 'DELETE', data, () =>
      modal.alert('Success', 'News entry was deleted', () => {
        window.location = '/manage/news';
      }));
  };

  $('button[data-action="edit"]').click(e => {
    const btn = e.currentTarget;
    const newsId = parseInt(btn.dataset.news);
    window.location = `/manage/news/${ newsId }`;
  });

  $('button[data-action="delete"]').click(e => {
    const btn = e.currentTarget;
    const newsId = btn.dataset.news;

    modal.promptWithCancelBtn('Delete news', modalBody, [{
      label: 'Delete',
      action: 'dismiss',
      callback: () => deleteNews(newsId)
    }]);
  });
};


const managePage_addNews = () => {
  mangePage_news();
  const form = $('#form-edit-news');
  const modalBody = `
    <p>News entry preview:</p>
    <div id="dialog-news-preview"></div>
    <label>
      <input type="checkbox" checked id="checkbox-main-regenerate"> Regenerate main page
    </label>`;

  const onDone = (data, status) =>
    modal.alert('Success', 'News entry added', () => {
      window.location = '/manage/news';
    });

  const addNews = () => {
    const data = {
      data: serializeForm(form),
      regenerate: $('#checkbox-main-regenerate').prop('checked')
    };

    modal.wait();
    sendJSON(form.attr('action'), 'PUT', data, onDone);
  };

  form.submit((e) => {
    modal.promptWithCancelBtn('Add news', modalBody, [{
        label: 'Add',
        action: 'dismiss',
        callback: addNews
      }])
      .then(() => {
        fetchPreivew('/preview/news', serializeForm(form), $('#dialog-news-preview'));
      });
    e.preventDefault();
  });
};


const managePage_editNews = () => {
  mangePage_news();
  const form = $('#form-edit-news');
  const modalBody = `
    <p>News entry preview:</p>
    <div id="dialog-news-preview"></div>
    <label>
      <input type="checkbox" checked id="checkbox-main-regenerate"> Regenerate main page
    </label>
  `;

  const onDone = (data, status) =>
    modal.alert('Success', 'News entry updated', () => {
      window.location = '/manage/news';
    });

  const addNews = () => {
    const data = {
      data: serializeForm(form),
      regenerate: $('#checkbox-main-regenerate').prop('checked')
    };

    modal.wait();
    sendJSON(form.attr('action'), 'PATCH', data, onDone);
  };

  form.submit((e) => {
    modal.promptWithCancelBtn('Edit news', modalBody, [{
        label: 'Save changes',
        action: 'dismiss',
        callback: addNews
      }])
      .then(() => {
        fetchPreivew('/preview/news', serializeForm(form), $('#dialog-news-preview'));
      });

    e.preventDefault();
  });
};


const managePage_maintenance = () => {
  const onDone = (data) => {
    const took = data.took;
    const message = `Rebuild complete. Took <strong>${ took }</strong> seconds.`;
    modal.alert('Success', message);
  };
  $('button[data-action="rebuildall"]').click((e) => {
    modal.wait();
    sendJSON('/api/regenerate', 'POST', {}, onDone);
  });
};


const managePage_profile = () => {
  const updateUserForm = $('#form-update-user');
  const onUserUpdated = (data) => {
    modal.alert('Success', 'Profile updated');
  };
  updateUserForm.submit((e) => {
    modal.wait();
    sendJSON('/api/me', 'PATCH', serializeForm(updateUserForm), onUserUpdated);
    e.preventDefault();
  });
  const changePasswordForm = $('#form-change-password');
  const onPasswordChanged = (data) => {
    modal.alert('Success', 'Passord successfully changed');
  };
  changePasswordForm.submit((e) => {
    modal.wait();
    sendJSON('/api/me/password', 'PATCH', serializeForm(changePasswordForm), onPasswordChanged);
    e.preventDefault();
  });
};


export const init = () => {
  const body = document.body;
  if (!body.classList.contains('manage-page')) {
    return;
  }
  initPreviewBtns();
  modal.initModals();
  if (body.classList.contains('manage-page-addboard')) {
    managePage_addBoard();
    return;
  }
  if (body.classList.contains('manage-page-delboard')) {
    managePage_deleteBoard();
    return;
  }
  if (body.classList.contains('manage-page-boardopts')) {
    managePage_updateBoard();
    return;
  }
  if (body.classList.contains('manage-page-sitesettings')) {
    managePage_siteSettings();
    return;
  }
  if (body.classList.contains('manage-page-addnews')) {
    managePage_addNews();
    return;
  }
  if (body.classList.contains('manage-page-editnews')) {
    managePage_editNews();
    return;
  }
  if (body.classList.contains('manage-page-maintenance')) {
    managePage_maintenance();
    return;
  }
  if (body.classList.contains('manage-page-profile')) {
    managePage_profile();
    return;
  }
}
