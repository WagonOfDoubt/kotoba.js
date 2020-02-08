/**
 * Bottom admin panel features
 * @module modules/admin-panel
 */

import $ from 'jquery';
import 'jquery-serializejson';
import * as modal from './modal';
import { sendSetFlagRequest, sendJSON } from '../utils/api-utils';
import { closeAllVideos, minimizeAllImages } from './attachment-viewer';
import { selectTab } from './tabs';
import adminPanelTemplate from '../templates-compiled/admin-panel';
import reflinkTemplate from '../templates-compiled/reflink';
import actionResultReportTemplate from '../templates-compiled/action-result-report';


const addAdminPanel = ($form) => {
  const $adminPanel = $(adminPanelTemplate({}));
  $form.append($adminPanel);

  const onSetFlagBtn = (url, col, e) => {
    e.preventDefault();
    const { name, value } = e.target;
    const setFlags = {};
    const formData = $form.serializeJSON();
    const collection = formData[col];
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

  const onReportPosts = (url, e) => {
    e.preventDefault();
    const { name, value } = e.target;
    const formData = $form.serializeJSON();
    const collection = formData.posts;

    const posts = collection.map(tragetStr => {
      const [ post, boardUri, sPostId, attachmentIndex ] = tragetStr.split('-');
      const postId = parseInt(sPostId);
      return { boardUri, postId };
    });
    const postList = posts.map(reflinkTemplate).join(', ');
    const onDone = (response) => {
      console.log(response);
      let status = 'Success';
      if (response.statusText) {
        status = `${response.status} ${response.statusText}`;
      }
      if (response.responseJSON) {
        response = response.responseJSON;
      }
      modal
        .alert(status, actionResultReportTemplate(response));
    };
    modal
      .confirmPrompt('Report posts', `
        <div>Report following posts: ${postList}</div>
        <div>Reason:</div>
        <div>
          <textarea name="text" class="from-input" cols="38" rows="4"></textarea>
        </div>`)
      .then(({returnValue, formData}) => {
        const data = {
          items: posts.map(p => ({ target: p })),
          reason: formData.text,
        };
        const url = '/api/report';
        modal.wait();
        sendJSON(url, 'post', data)
          .then(onDone)
          .catch(onDone);
      });
  };

  const onSetReportFlagBtn = (url, col, e) => {
    e.preventDefault();
    const { name, value } = e.target;
    const setFlags = {};
    const formData = $form.serializeJSON();
    const collection = formData[col];

    const reports = collection.map(reportId => {
      const update = reportId;
      update[name] = value === 'true';
      return update;
    });
    const data = { reports };
    sendSetFlagRequest(url, data);
  };

  // add events
  $('.js-set-attachment-flag').on('click', (e) => onSetFlagBtn('/api/post', 'attachments', e));
  $('.js-set-post-flag').on('click', (e) => onSetFlagBtn('/api/post', 'posts', e));
  $('.js-set-thread-flag').on('click', (e) => onSetFlagBtn('/api/post', 'posts', e));
  $('.js-set-report-flag').on('click', (e) => onSetReportFlagBtn('/api/report', 'reports', e));
  $('.js-report-posts').on('click', (e) => onReportPosts('/api/report', e));

  return $adminPanel[0];
};


const checkAdminForm = ($form) => {
  let adminPanel = document.querySelector('.admin-panel');
  
  const toggleTabVisibility = (tabId, hasSelectedItems) => {
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
      if (hasSelectedItems && !adminPanel.querySelector('.tabs__content.show')) {
        selectTab(`#admin-panel__tab_${tabId}`);
      }
      tab.classList.toggle('hidden', !hasSelectedItems);
    }
    return tab && hasSelectedItems;
  };

  const tabs = {
    'modlog': 'input[name="items[]"]:checked',
    'posts': 'input[name="posts[]"]:checked',
    'threads': '.post_op input[name="posts[]"]:checked',
    'attachments': 'input[name="attachments[]"]:checked',
    'reports': 'input[name="reports[][_id]"]:checked',
  };
  let hasSelected = false;
  const tabsVisible = {};
  for (const [ tab, selector ] of Object.entries(tabs)) {
    const thisTabHasSelected = !!$form.has(selector).length;
    tabsVisible[tab] = thisTabHasSelected;
    hasSelected = thisTabHasSelected || hasSelected;
  }
  if (!adminPanel && hasSelected) {
    adminPanel = addAdminPanel($form);
  }

  if (adminPanel) {
    for (const [tab, visible] of Object.entries(tabsVisible)) {
      toggleTabVisibility(tab, visible);
    }
    adminPanel.classList.toggle('show', hasSelected);
  }
};


/**
 * Initialize module
 */
const initAdminPanel = () => {
  const $form = $('.admin-form:first');

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

  $('.js-select-attachment, .js-select-modlog-item, .js-select-report').on('change', (e) => {
    checkAdminForm($form);
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
};

export { initAdminPanel };
