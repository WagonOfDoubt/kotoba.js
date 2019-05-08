import '@babel/polyfill';
import $ from 'jquery';
import 'jquery-serializejson';

import { initExpandVideo, initExpandImage, initSelectAttachment } from './modules/attachment-viewer';
import { initHidePost } from './modules/hide-post';
import { initExpandThread } from './modules/expand-thread';
import { initAdminPanel } from './modules/admin-panel';
import { localizeTime } from './modules/time';
import { init as initManage } from './modules/manage';
import { init as initForms } from './modules/postform';
import { initTabs } from './modules/tabs';
import { initToggleVisibility } from './modules/toggle-visibility';
import { initTables } from './modules/table';
import { initReflinks } from './modules/reflink-popup';
import { initChangeStyle } from './modules/change-style';


$(() => {
  initSelectAttachment();
  initExpandImage();
  initExpandVideo();
  initHidePost();
  initExpandThread();
  initAdminPanel();
  localizeTime();
  initManage();
  initForms();
  initTabs();
  initToggleVisibility();
  initTables();
  initReflinks();
  initChangeStyle();
});
