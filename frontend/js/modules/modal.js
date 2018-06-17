/**
 * Modal module.
 * @module modal
 */

import $ from 'jquery';
import 'jquery-serializejson';
import dialogPolyfill from 'dialog-polyfill';


/**
 * Create modal with Close button.
 * @return {Pomise}
 * @see {@link prompt}
 */
export const alert = (title, message) =>
  prompt(title, message, [{
    label: 'Close',
    type: 'submit',
    value: 'close'
  }]);


/**
 * Create modal prompt with Ok and Cancel button.
 * @param {string} title - dialog title (can be HTML)
 * @param {string} message - dialog body (can be HTML)
 * @param {string} confirmBtnLabel - label of confirmation button. Default is 'Ok'
 * @return {Pomise} promise - promise that only resolved when 'Ok' button is clicked.
 * @see {@link prompt}
 */
export const confirmPrompt = (title, message, confirmBtnLabel = 'Ok') => {
  const okBtn = {
    label: confirmBtnLabel,
    type: 'submit',
    value: 'ok'
  };
  const cancelBtn = {
    label: 'Cancel',
    type: 'submit',
    value: 'cancel'
  };
  return prompt(title, message, [ okBtn, cancelBtn ], ['ok']);
};


/**
 * Create modal prompt with buttons.
 * The dialog will be removed from DOM automaticaly when it's closed.
 * @param {string} title - dialog title (can be HTML)
 * @param {string} message - dialog body (can be HTML)
 * @param {Object[]} buttons - array of button object.
 * @param {string} buttons[].type - button type attribute.
 * @param {string} buttons[].value - button return value.
 * @param {string} buttons[].label - button caption.
 * @param {string[]} acceptValues - this argument is passed to dialogPromise
 * @param {boolean} ignoreReject - this argument is passed to dialogPromise.
 * @return {Pomise} {@link dialogPromise}
 */
export const prompt = (title, message, buttons = [], acceptValues = [], ignoreReject = true) => {
  closeAllModals();
  buttons = buttons.map(btn => `<button class="btn" type="${ btn.type || 'button' }" value="${ btn.value }">${ btn.label }</button>`);
  const $dialog = $(
    `<dialog class="modal fade dispose">
      <div class="modal-dialog">
        <form class="modal-content" method="dialog">
          <div class="modal-header">
            <h5>${ title }</h5>
          </div>
          <div class="modal-body">
            ${ message }
          </div>
          <div class="modal-footer">
            ${ buttons.join('') }
          </div>
        </form>
      </div>
    </dialog>`);
  $(document.body).append($dialog);
  const dialog = $dialog[0];
  dialogPolyfill.registerDialog(dialog);
  return dialogPromise(dialog, acceptValues, ignoreReject);
};


/**
 * Show modal dialog and return Promise that will be resolved when dialog will
 * be closed or rejected if dialog was cancelled by hitting Esc key.
 * Promise resolves and rejecs with { returnValue, formData }.
 * @param {HTMLDialogElement} dialog - dialog to show.
 * @param {string[]} acceptValues - array of dialog.returnValue with which promise should be resolved.
 * If returnValue is not in array, promise will be rejected. If array is empty, promise resolved regardless of returnValue.
 * @param {boolean} ignoreReject - if true, Promise will newer be rejected.
 * @return {Pomise}
 */
export const dialogPromise = (dialog, acceptValues = [], ignoreReject = true) => {
  return new Promise((resolve, reject) => {
    const closeHander = () => {
      const formData = $(dialog).find('form').serializeJSON({checkboxUncheckedValue: 'false'});
      if (acceptValues.length && !acceptValues.includes(dialog.returnValue)) {
        if (!ignoreReject) {
          reject({
            returnValue: dialog.returnValue,
            formData: formData
          });
        }
      } else {
        resolve({
          returnValue: dialog.returnValue,
          formData: formData
        });
      }
      removeListeners();
    };
    const cancelHandler = () => {
      const formData = $(dialog).find('form').serializeJSON({checkboxUncheckedValue: 'false'});
      if (!ignoreReject) {
        reject({
          returnValue: 'cancel',
          formData: formData
        });
      }
      removeListeners();
    };
    const removeListeners = () => {
      dialog.removeEventListener('close', closeHander);
      dialog.removeEventListener('cancel', cancelHandler);
      exitModalMode();
      if ($(dialog).hasClass('dispose')) {
        $(dialog).remove();
      }
    };
    dialog.addEventListener('close', closeHander);
    dialog.addEventListener('cancel', cancelHandler);
    showModal(dialog);
  });
};


/**
 * Show spinner that blocks page.
 */
export const wait = () => {
  closeAllModals();
  const $dialog = $(`<dialog class="modal dispose modal-wait">
      <div class="modal-dialog">
        <div class="loader">
          <svg class="circular-loader"viewBox="25 25 50 50" >
            <circle class="loader-path" cx="50" cy="50" r="20" fill="none" stroke="#70c542" stroke-width="2" />
          </svg>
        </div>
      </div>
    </dialog>`);
  $(document.body).append($dialog);
  const dialog = $dialog[0];
  dialogPolyfill.registerDialog(dialog);
  // wait spinner can not be closed by Esc key
  dialog.addEventListener('cancel', (e) => e.preventDefault());
  showModal(dialog);
};


/**
 * Close all open modals that present on page.
 */
export const closeAllModals = () => {
  $('dialog[open]').each((i, dialog) => {
    dialog.close()
    // remove disposabe modals
    if ($(dialog).hasClass('dispose')) {
      $(dialog).remove();
    }
  });
  exitModalMode();
};


/**
 * Enter modal mode. This removes scrollbars from page, so only modal content
 * will be scrollable.
 */
export const enterModalMode = () => document.body.classList.add('modal-open');


/**
 * Exit modal mode. Return page to it's normal state.
 */
export const exitModalMode = () => document.body.classList.remove('modal-open');


/**
 * Show modal dialog. This also removes scrollbar from page.
 * @param {HTMLDialogElement} dialog - dialog to show.
 */
export const showModal = (dialog) => {
  closeAllModals();
  enterModalMode();
  dialog.showModal();
};


/**
 * Initialize either all dialog elements on page, or one dialog supplied as argument.
 * Call this without arguments once when page is loaded, and each time dialog is added on page.
 * @param {HTMLDialogElement} dialog - dialog to initialize. If null, all dialogs will be initialized.
 */
export const init = (dialog = null) => {
  if (dialog) {
    dialogPolyfill.registerDialog(dialog);
  } else {
    $('dialog').each((i, dialog) => dialogPolyfill.registerDialog(dialog));
  }
};
