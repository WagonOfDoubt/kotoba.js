import $ from 'jquery';

const activeModals = [];

export const alert = (title, message, onDismiss) =>
  prompt(title, message, [
    {
      label: 'Close',
      action: 'dismiss',
      callback: onDismiss
    }
  ]);

export const promptWithCancelBtn = (title, message, buttons = []) =>
  prompt(title, message, [...buttons, {
      label: 'Cancel',
      action: 'dismiss'
  }]);

export const prompt = (title, message, buttons = []) => {
  const dialog = $(`<div class="modal fade dispose">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5>${ title }</h5>
          </div>
          <div class="modal-body">
            ${ message }
          </div>
          <div class="modal-footer">
          </div>
        </div>
      </div>
    </div>`);
  buttons = buttons.map(btnObj => {
    const { classes, action, callback, label } = btnObj;
    const btn = $('<button class="btn" type="bytton">');
    btn.text(label);
    if (classes) {
      btn.addClass(classes.join(' '));
    }
    if (action === 'dismiss') {
      btn.attr('data-dismiss', 'modal');
      btn.click(e => {
        hideModal(dialog);
        if (callback) {
          callback();
        }
      });
    } else if (callback) {
      btn.click(e => callback());
    }
    return btn;
  });
  dialog.find('.modal-footer').append(...buttons);
  hideAllModals();
  return new Promise((resolve, reject) => {
    requestAnimationFrame(() => {
      $(document.body).append(dialog);
      showModal(dialog);
      resolve();
    });
  });
};

export const wait = () => {
  const dialog = $(`<div class="modal dispose modal-wait">
      <div class="modal-dialog">
        <div class="loader">
          <svg class="circular-loader"viewBox="25 25 50 50" >
            <circle class="loader-path" cx="50" cy="50" r="20" fill="none" stroke="#70c542" stroke-width="2" />
          </svg>
        </div>
      </div>
    </div>`);
  hideAllModals();
  $(document.body).append(dialog);
  showModal(dialog);
};

export const enterModalMode = () => {
  $(document.body).addClass('modal-open');
  $('.modal-backdrop').addClass('show');
};

export const exitModalMode = () => {
  $(document.body).removeClass('modal-open');
  $('.modal-backdrop').removeClass('show');
};

export const hideAllModals = () => {
  // remove all modals from list
  activeModals.length = 0;
  $('.modal.dispose').each((i, m) => {
    setTimeout(() => $(m).remove(), 300);
  });
  requestAnimationFrame(() =>
    $('.modal').removeClass('show'));
  exitModalMode();
};

export const hideModal = (modal) => {
  if (modal.hasClass('dispose')) {
    setTimeout(() => modal.remove(), 300);
  }
  requestAnimationFrame(() =>
    modal.removeClass('show'));
  // remove modal from list
  // to determine wether or not page should be in modal mode
  const modalIndex = activeModals.indexOf(modal);
  if (modalIndex >= 0) {
    activeModals.splice(modalIndex, 1);
  }
  if (activeModals.length === 0) {
    exitModalMode();
  }
};

export const showModal = (modal) =>
  requestAnimationFrame(() => {
    enterModalMode();
    activeModals.push(modal);
    modal.addClass('show');
  });

export const initModals = () => $('[data-dismiss="modal"]').click((e) => {
  hideModal($(e.currentTarget).closest('.modal'));
});
