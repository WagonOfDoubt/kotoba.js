import $ from 'jquery';
import 'jquery-serializejson';
import '../sass/global.scss';
import '../sass/umnochan.scss';

import { initExpandVideo } from './modules/expand-video';
import { initExpandImage } from './modules/expand-image';
import { initHidePost } from './modules/hide-post';
import { initExpandThread } from './modules/expand-thread';
import { localizeTime } from './modules/time';
import * as manage from './modules/manage';
import * as forms from './modules/form';

$(() => {
  initExpandImage();
  initExpandVideo();
  initHidePost();
  initExpandThread();
  localizeTime();
  manage.init();
  forms.init();
});
