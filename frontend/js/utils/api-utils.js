import $ from 'jquery';
import 'jquery-serializejson';
import escape from 'lodash.escape';
import truncate from 'lodash.truncate';
import { objectDiff } from './object-utils';
import * as modal from '../modules/modal';


export const serializeForm = ($form) =>
  $form.serializeJSON({checkboxUncheckedValue: "false"});


export const alertErrorHandler = (data) => {
  console.error(data);
  const {status, statusText} = data;
  const errorText = `Something went wrong (${ status } ${ statusText })`;
  if (!data.responseJSON) {
    return modal.alert('Error', errorText);
  }

  const errorToHTML = (error) => {
    if (error.stack) {
      return `<pre class="error">${ error.stack }</pre>`;
    } else if (error.param) {
      // express-validator error
      return `div class="error">${ error.param }: ${ error.msg }</div>`;
    } else {
      return `<div class="error">${ error.name }: ${ error.message }</div>`
    }
  }

  let alertMessage = errorText;
  if (data.responseJSON.errors) {
    alertMessage = Object.values(data.responseJSON.errors)
      .map(errorToHTML)
      .join('<br>');
  } else if (data.responseJSON.error) {
    alertMessage = errorToHTML(data.responseJSON.error);
  }
  return modal.alert('Error', alertMessage);
};


export const sendJSON = (url, type, data) => {
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


export const createTable = (rows = [], head = []) => {
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


export const fetchChanges = ($form, $populateContainer) => {
  const formData = serializeForm($form);
  $populateContainer.text('Loading...');
  const getRoute = $form.attr('action');
  $.getJSON(getRoute)
    .done((data) => {
      const diff = objectDiff(formData, data);
      const table = createTable(
        Object.entries(diff)
          .map(([key, value]) => [key, value.old, value.new ]),
        ['property', 'current value', 'new value']
      );
      $populateContainer.text('').append(table);
    })
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
