import $ from 'jquery';

const initCheckboxes = () => {
  const updateMasterState = ($master) => {
    const $slaves = $($master.data('target'));
    const checkboxesTotal = $slaves.length;
    const $checked = $slaves.filter(':checked');
    const checkboxesChecked = $checked.length;
    if (checkboxesChecked === 0) {
      $master.prop('checked', false);
      $master.prop('indeterminate', false);
    } else if (checkboxesTotal === checkboxesChecked) {
      $master.prop('checked', true);
      $master.prop('indeterminate', false);
    } else {
      $master.prop('checked', false);
      $master.prop('indeterminate', true);
    }
  };
  // checkboxes that control group of checkboxes
  $('body').on('change', '.js-checkbox-master', (e) => {
    const checked = e.target.checked;
    const $slaves = $(e.target.dataset.target);
    $slaves.prop('checked', checked);
    $slaves.trigger('change');
  });
  // checkboxes that are controlled by checkbox
  $('body').on('change', '.js-checkbox-slave', (e) => {
    const $master = $(e.target.dataset.target);
    updateMasterState($master);
  });
  // init checkboxes
  $('.js-checkbox-master').each((i, el) => {
    const $master = $(el);
    updateMasterState($master);
  });
};

const initSelectDeselect = () => {
  $('body').on('click', '.js-select-all-items', (e) => {
    e.preventDefault();
    const { target } = e.target.dataset;
    $(target)
      .prop('checked', true)
      .trigger('change');
  });

  $('body').on('click', '.js-deselect-all-items', (e) => {
    e.preventDefault();
    const { target } = e.target.dataset;
    $(target)
      .prop('checked', false)
      .trigger('change');
  });
};

const initSendForm = () => {
  $('body').on('click', '.js-send-form', (e) => {
    const $targetForm = $(e.target.dataset.target);
    $targetForm.trigger('send');
  });
};

const initHandlers = () => {
  initCheckboxes();
  initSelectDeselect();
  initSendForm();
};

export { initHandlers };
