/**
 * Api utils module
 * @module utils/api-utils
 */

import $ from 'jquery';
import 'jquery-serializejson';
import escape from 'lodash.escape';
import truncate from 'lodash.truncate';
import { objectDiff } from './object-utils';
import * as modal from '../modules/modal';
import tableTemplate from '../templates-compiled/table';
import actionResultReportTemplate from '../templates-compiled/action-result-report';


export const serializeForm = ($form) => {
  const formOptions = {
    customTypes: {
      list: (str) => str.split('\n').map(s => s.trim())
    },
    checkboxUncheckedValue: 'false',
  };

  return $form.serializeJSON(formOptions);
};


const errorToHTML = (error) => {
  if (error.stack) {
    return `<pre class="error">${ error.stack }</pre>`;
  } else if (error.param) {
    // express-validator error
    return `<div class="error">${ error.param }: ${ error.msg || error.message }</div>`;
  } else if (error.name) {
    return `<div class="error">${ error.name }: ${ error.msg || error.message }</div>`;
  } else {
    return `<div class="error">${ error.msg || error.message }</div>`;
  }
};


const getErrorMessage = (data) => {
  if (data.responseJSON.errors) {
    return `${Object.values(data.responseJSON.errors)
      .map(errorToHTML)
      .join('<br>')}`;
  }
  if (data.responseJSON.error) {
    return `${errorToHTML(data.responseJSON.error)}`;
  }
  if (data.status && data.statusText) {
    return `${ data.status } ${ data.statusText }`;
  }
  return 'Something went wrong';
};


export const alertErrorHandler = (data) => {
  console.error(data);
  const {status, statusText} = data;
  const errorText = `Something went wrong (${ status } ${ statusText })`;
  if (!data.responseJSON) {
    return modal.alert('Error', errorText);
  }

  let alertMessage = getErrorMessage(data);
  return modal.alert(`Error: ${ status } ${ statusText }`, alertMessage);
};


export const successErrorHandler = (successMessage, ignoreErrors = []) => {
  return (data) => {
    console.log(data);
    let { success, fail } = data;
    let alertMessage = `No changes were made<br>`;
    if (success && success.length) {
      alertMessage = `${successMessage} (${success.length})<br>`;
    }
    if (fail && fail.length && ignoreErrors.length) {
      fail = fail.filter(failobj => failobj.error && !ignoreErrors.includes(failobj.error.code));
    }
    if (fail && fail.length) {
      alertMessage += '<br>';
      alertMessage += fail.map((f) => errorToHTML(f.error)).join('');
    }

    return modal.alert('Success', alertMessage);
  };
};


export const sendJSON = (url, method, data) => {
  return new Promise((resolve, reject) => {
    modal.wait();
    $.ajax({
      url: url,
      method: method,
      type: method,
      data: JSON.stringify(data),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json'
    })
      .done(resolve)
      .fail(reject);
  });
};


export const sendFormData = (url, method, data) => {
  return new Promise((resolve, reject) => {
    modal.wait();
    $.ajax({
      url: url,
      data: data,
      cache: false,
      contentType: false,
      processData: false,
      method: method,
      type: method,
    })
      .done(resolve)
      .fail(reject);
  });
};


export const fetchChanges = ($form, $populateContainer) => {
  const formData = serializeForm($form);
  $populateContainer.text('Loading...');
  const getRoute = $form.data('getUrl') || $form.attr('action');
  $.getJSON(getRoute)
    .done((data) => {
      const diff = Object.entries(objectDiff(formData, data));
      const hasExistingValues = diff.some(val => val.old !== undefined);
      if (diff.length) {
        const $table = $(tableTemplate({
          body: diff.map(([key, value]) => hasExistingValues ? [key, value.old, value.new ] : [key, value.new ]),
          head: [
            hasExistingValues ? ['Property', 'Current value', 'New value'] : ['Property', 'Value']
          ],
          filter: str => truncate(str, { length: 100 }),
        }));
        $populateContainer.text('').append($table);        
      } else {
        $populateContainer.text('No changes detected');
      }
    })
    .fail((data) => {
      $populateContainer.html(getErrorMessage(data));
    });
};


export const fetchPreivew = (url, data, $populateContainer) => {
  $populateContainer.text('Loading...');
  const onDone = (data, status) => {
    $populateContainer.html(data);
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
        $populateContainer.html(errorsMsg);
      } else {
        $populateContainer.text('Error ' + data.status);
      }
    });
};


export const sendSetFlagRequest = (url, data) => {
  modal.wait();
  const onDone = (response) => {
    console.log(response);
    let status = 'Success';
    if (response.responseJSON) {
      status = `${response.status} ${response.statusText}`;
      response = response.responseJSON;
    }
    modal
      .alert(status, actionResultReportTemplate(response))
      .finally(() => window.location.reload());
  };
  sendJSON(url, 'patch', data)
    .then(onDone)
    .catch(onDone);
};
