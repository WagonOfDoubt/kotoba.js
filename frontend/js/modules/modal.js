/**
 * Modal module
 * @module modules/modal
 */

import $ from 'jquery';
import 'jquery-serializejson';
import dialogPolyfill from 'dialog-polyfill';
import modalPromptTemplate from '../templates-compiled/modal-prompt';
import modalWaitTemplate from '../templates-compiled/modal-wait';


/**
 * Create modal with Close button.
 * @return {Promise}
 * @see {@link prompt}
 */
export const alert = (title, message) =>
  prompt(title, message, [{
    label: 'Close',
    type: 'submit',
    value: 'close'
  }]);


/**
 * Create modal prompt with OK and Cancel button.
 * @param {string} title Dialog title (can be HTML)
 * @param {string} message Dialog body (can be HTML)
 * @param {string} confirmBtnLabel Label of confirmation button. Default is
 *    'OK'
 * @return {Promise} promise Promise that only resolved when 'OK' button is
 *    clicked.
 * @see {@link prompt}
 */
export const confirmPrompt = (title, message, confirmBtnLabel = 'OK') => {
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
 * Create modal prompt with buttons. The dialog will be removed from DOM
 *    automatically when it's closed.
 * @param {string} title Dialog title (can be HTML)
 * @param {string} message Dialog body (can be HTML)
 * @param {Object[]} buttons Array of button object.
 * @param {string} buttons[].type Button type attribute.
 * @param {string} buttons[].value Button return value.
 * @param {string} buttons[].label Button caption.
 * @param {string[]} acceptValues This argument is passed to dialogPromise
 * @param {boolean} ignoreReject This argument is passed to dialogPromise.
 * @return {Promise} {@link dialogPromise}
 */
export const prompt = (title, message, buttons = [], acceptValues = [], ignoreReject = true) => {
  closeAllModals();
  const $dialog = $(modalPromptTemplate({ title, message, buttons }));
  $(document.body).append($dialog);
  const dialog = $dialog[0];
  dialogPolyfill.registerDialog(dialog);
  return dialogPromise(dialog, acceptValues, ignoreReject);
};


/**
 * Show modal dialog and return Promise that will be resolved when dialog will
 *    be closed or rejected if dialog was canceled by hitting Esc key. Promise
 *    resolves and rejects with { returnValue, formData }.
 * @param {HTMLDialogElement} dialog Dialog to show.
 * @param {string[]} acceptValues Array of dialog.returnValue with which
 *    promise should be resolved. If returnValue is not in array, promise will
 *    be rejected. If array is empty, promise resolved regardless of
 *    returnValue.
 * @param {boolean} ignoreReject If true, Promise will newer be rejected.
 * @return {Promise}
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
  const $dialog = $(modalWaitTemplate());
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
    dialog.close();
    // remove disposable modals
    if ($(dialog).hasClass('dispose')) {
      $(dialog).remove();
    }
  });
  exitModalMode();
};


/**
 * Enter modal mode. This removes scrollbars from page, so only modal content
 *    will be scrollable.
 */
export const enterModalMode = () => document.body.classList.add('modal-open');


/**
 * Exit modal mode. Return page to it's normal state.
 */
export const exitModalMode = () => document.body.classList.remove('modal-open');


/**
 * Show modal dialog. This also removes scrollbar from page.
 * @param {HTMLDialogElement} dialog Dialog to show.
 */
export const showModal = (dialog) => {
  closeAllModals();
  enterModalMode();
  dialog.showModal();
};


/**
 * Initialize either all dialog elements on page, or one dialog supplied as
 *    argument. Call this without arguments once when page is loaded, and each
 *    time dialog is added on page.
 * @param {HTMLDialogElement} dialog Dialog to initialize. If null, all
 *    dialogs will be initialized.
 */
export const init = (dialog = null) => {
  if (dialog) {
    dialogPolyfill.registerDialog(dialog);
  } else {
    $('dialog').each((i, dialog) => dialogPolyfill.registerDialog(dialog));
  }
};
