import $ from 'jquery';
import 'jquery-serializejson';
import '../sass/global.scss';
import '../sass/umnochan.scss';

import { initExpandVideo } from './modules/expand-video';
import { initExpandImage } from './modules/expand-image';
import { initHidePost } from './modules/hide-post';
import { initExpandThread } from './modules/expand-thread';
import { initAdminPanel } from './modules/admin-panel';
import { localizeTime } from './modules/time';
import { init as initManage } from './modules/manage';
import { init as initForms } from './modules/form';

$(() => {
  initExpandImage();
  initExpandVideo();
  initHidePost();
  initExpandThread();
  initAdminPanel();
  localizeTime();
  initManage();
  initForms();
});
