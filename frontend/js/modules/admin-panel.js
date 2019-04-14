/**
 * Bottom admin panel features
 * @module modules/admin-panel
 */

import $ from 'jquery';
import 'jquery-serializejson';
import * as modal from './modal';
import { serializeForm, alertErrorHandler, sendJSON, createTable, fetchChanges,
  fetchPreivew } from '../utils/api-utils';
import { closeAllVideos, minimizeAllImages } from './attachment-viewer';
import { selectTab } from './tabs';
import modlogModalBodyTemplate from '../templates-compiled/modlog-modal-body';
import actionResultReportTemplate from '../templates-compiled/action-result-report';


const checkAdminForm = ($form) => {
  const adminPanel = document.querySelector('.admin-panel');
  if (!adminPanel) {
    return;
  }
  
  const toggleTabVisibility = (tabId, formConditionSelector) => {
    const hasSelectedItems = !!$form.has(formConditionSelector).length;
    const tab = adminPanel.querySelector(`.admin-panel__item_${tabId}`);
    if (tab) {
      // if current tab was selected, but now hidden
      if (!hasSelectedItems && tab.querySelector(`.active`)) {
        // try to select some other tab
        const tabLink = adminPanel.querySelector(`.tab-menu__item:not(.hidden) a.js-select-tab`);
        if (tabLink) {
          selectTab(tabLink.getAttribute('href'));
        }
      }
      // if no tabs on panel shown, select this tab
      if (!adminPanel.querySelector('.tabs__content.show')) {
        selectTab(`#admin-panel__tab_${tabId}`);
      }
      tab.classList.toggle('hidden', !hasSelectedItems);
    }
    return tab && hasSelectedItems;
  };

  let hasSelected = false;
  hasSelected = toggleTabVisibility('modlog', 'input[name="items[]"]:checked') || hasSelected;
  hasSelected = toggleTabVisibility('posts', 'input[name="posts[]"]:checked') || hasSelected;
  hasSelected = toggleTabVisibility('threads', '.oppost input[name="posts[]"]:checked') || hasSelected;
  hasSelected = toggleTabVisibility('attachments', 'input[name="attachments[]"]:checked') || hasSelected;

  adminPanel.classList.toggle('show', hasSelected);
};


const sendSetFlagRequest = (url, data) => {
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


const initCheckboxes = () => {
  const $form = $('.admin-form, #delform');
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
  $('.js-checkbox-master').on('change', (e) => {
    const checked = e.target.checked;
    const $slaves = $(e.target.dataset.target);
    $slaves.prop('checked', checked);
    checkAdminForm($form);
  });
  // checkboxes that are controlled by checkbox
  $('.js-checkbox-slave').on('change', (e) => {
    const $master = $(e.target.dataset.target);
    updateMasterState($master);
    checkAdminForm($form);
  });
  // init checkboxes
  $('.js-checkbox-master').each((i, el) => {
    const $master = $(el);
    updateMasterState($master);
    checkAdminForm($form);
  });
};


/**
 * Initialize module
 */
const initAdminPanel = () => {
  const $form = $('.admin-form, #delform');

  const onSetFlagBtn = (url, e) => {
    e.preventDefault();
    const { name, value } = e.target;
    const setFlags = {};
    const formData = $form.serializeJSON();
    const isAttachment = name.startsWith('attachments.$[n].');
    const collection = isAttachment ? formData.attachments : formData.posts;
    /**
     * [
     *   {
     *     target: { boardUri: 'b', postId: 123},
     *     update: { attachments.0.isDeleted: true }
     *   },
     *   ...
     * ]
     */
    const items = collection.map(tragetStr => {
      const [ post, boardUri, sPostId, attachmentIndex ] = tragetStr.split('-');
      const postId = parseInt(sPostId);
      const field = name.replace('$[n]', attachmentIndex);
      const target = { boardUri, postId };
      const update = {};
      update[field] = value === 'true';
      return { target, update };
    });
    const data = { items };
    data.regenerate = true;
    data.postpassword = formData.postpassword;
    sendSetFlagRequest(url, data);
  };

  // add events
  $('.js-set-attachment-flag').on('click', (e) => onSetFlagBtn('/api/post', e));
  $('.js-set-post-flag').on('click', (e) => onSetFlagBtn('/api/post', e));
  $('.js-set-thread-flag').on('click', (e) => onSetFlagBtn('/api/post', e));

  $('.js-select-all-items').on('click', (e) => {
    e.preventDefault();
    const { target } = e.target.dataset;
    $form
      .find(target)
      .prop('checked', true)
      .trigger('change');
  });

  $('.js-deselect-all-items').on('click', (e) => {
    e.preventDefault();
    const { target } = e.target.dataset;
    $form
      .find(target)
      .prop('checked', false)
      .trigger('change');
  });

  $('.js-select-post').on('change', (e) => {
    const input = e.target;
    const post = document.getElementById(input.value);
    post.classList.toggle('selected', input.checked);
    // when post selected, minimize all attachments
    minimizeAllImages(post);
    if (!post.classList.contains('selected')) {
      $(post).find('.js-select-attachment').prop('checked', false).change();
    }
    closeAllVideos(post);
    checkAdminForm($form);
  });

  $('.js-select-attachment').on('change', (e) => {
    const checkbox = e.target;
    const attachment = checkbox.closest('.attachment');
    if (attachment) {
      attachment.classList.toggle('selected', checkbox.checked);
    }
    checkAdminForm($form);
  });

  $('.js-send-form').click((e) => {
    const $targetForm = $(e.target.dataset.target);
    $targetForm.trigger('send');
  });

  $('#modlog-form').on('send', (e) => {
    const $targetForm = $(e.target);
    const formData = $targetForm.serializeJSON();
    const items = formData.items.map(JSON.parse);
    const updates = items.reduce((acc, val) => {
      const { postId, boardUri } = val.target;
      const timestamp = val.target.timestamp;
      const targetKey = `${boardUri}-${postId}`;
      if (!acc[targetKey]) {
        acc[targetKey] = {
          target: val.target,
          update: {},
        };
      }
      for (let [key, value] of Object.entries(val.update)) {
        if (!(key in acc[targetKey].update)) {
          acc[targetKey].update[key] = value;
        } else {
          const currentValue = acc[targetKey].update[key];
          const newValue = currentValue.ts > value.ts ? currentValue : value;
          acc[targetKey].update[key] = newValue;
        }
      }
      return acc;
    }, {});
    const groupedItems = Object.values(updates).map((u) => {
      for (let [key, value] of Object.entries(u.update)) {
        u.update[key] = value.value;
      }
      return u;
    });

    modal
      .confirmPrompt('Confirm action', modlogModalBodyTemplate({ items: groupedItems }))
      .then(({returnValue, formData}) => {
        console.log(groupedItems, returnValue, formData);
        const regenerate = formData.regenerate;
        const requestData = {
          items: groupedItems,
          regenerate: regenerate,
        };
        sendSetFlagRequest('/api/post', requestData);
      });
    e.preventDefault();
  });

  // initial set on page load
  const addClassToClosestParent = (sourceSelector, parentSelector, className) =>
    Array
      .from(document.querySelectorAll(sourceSelector))
      .map(checkbox => checkbox.closest(parentSelector))
      .filter(attachment => attachment)
      .map(attachment => attachment.classList.add(className));

  addClassToClosestParent('input[name="posts[]"]:checked', '.post', 'selected');
  addClassToClosestParent('input[name="attachments[]"]:checked', '.attachment', 'selected');
  checkAdminForm($form);

  initCheckboxes();
};

export { initAdminPanel };
