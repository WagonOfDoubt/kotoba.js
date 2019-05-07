/**
 * Expanding and playing attachments
 * @module modules/attachment-viewer
 */

import $ from 'jquery';
import videoPlayerTemplate from '../templates-compiled/video-player';


/**
 * Close full image in image attachment and return to thumbnail view
 * @param  {HTMLElement} a Attachment container
 */
export const minimizeImage = (a) => {
  const img = a.querySelector('.thumbnail__image');
  if (!img) {
    return;
  }
  const { thumbSrc, thumbWidth, thumbHeight } = a.dataset;
  img.setAttribute('width', thumbWidth);
  img.setAttribute('height', thumbHeight);
  img.setAttribute('src', thumbSrc);
  a.dataset.maximized = 'false';
  return a;
};


/**
 * Show full image in image attachment
 * @param  {HTMLElement} a Attachment container
 */
export const maximizeImage = (a) => {
  const img = a.querySelector('.thumbnail__image');
  if (!img) {
    return;
  }
  const { fullSrc, fullWidth, fullHeight } = a.dataset;
  img.setAttribute('width', fullWidth);
  img.setAttribute('height', fullHeight);
  img.setAttribute('src', fullSrc);
  a.dataset.maximized = 'true';
  return a;
};


/**
 * Show/hide full image in image attachment
 * @param  {HTMLElement} a Attachment container
 */
export const toggleImage = (a) => {
  if (a.dataset.maximized === 'true') {
    minimizeImage(a);
  } else {
    maximizeImage(a);
  }
};


/**
 * Show full images for all image attachments
 * @param  {HTMLElement} [parentElement=document.body] Root element to search
 *    for attachments
 */
export const minimizeAllImages = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_image .thumbnail'))
    .map(minimizeImage);
};


/**
 * Close all currently opened full images for all image attachments
 * @param  {HTMLElement} [parentElement=document.body] Root element to search
 *    for attachments
 */
export const maximizeAllImages = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_image .thumbnail'))
    .map(maximizeImage);
};


/**
 * Show video player in video attachment
 * @param  {HTMLElement} a Attachment container
 */
export const showVideo = (a) => {
  const { fullSrc, fullWidth, fullHeight, thumbSrc } = a.dataset;
  const $container = $(a).parent();
  if (!fullSrc || $container.hasClass('attachment_deleted')) {
    return;
  }
  const $playerContainer = $('<div class="video-container">');
  const muted = true;
  const $player = $(videoPlayerTemplate({
    thumbSrc,
    fullSrc,
    muted,
    fullWidth,
    fullHeight,
  }));

  $container.addClass('attachment_video_playing');
  $playerContainer.append($player);
  $container.append($playerContainer);
  a.dataset.maximized = 'true';
};


/**
 * Close video player in video attachment
 * @param  {HTMLElement} a Attachment container
 */
export const closeVideo = (a) => {
  const $container = $(a).parent();
  if ($container.hasClass('attachment_deleted')) {
    return;
  }
  $container.removeClass('attachment_video_playing');
  $container.find('.video-player').remove();
  a.dataset.maximized = 'false';
};


/**
 * Close all currently opened videos
 * @param  {HTMLElement} [parentElement=document.body] Root element to search
 *    for attachments
 */
export const closeAllVideos = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_video .thumbnail'))
    .map(closeVideo);
};


/**
 * Show all videos for all video attachments
 * @param  {HTMLElement} [parentElement=document.body] Root element to search
 *    for attachments
 */
export const showAllVideos = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_video .thumbnail'))
    .map(closeVideo);
};


/**
 * Show/hide video player for attachment
 * @param  {HTMLElement} a Attachment container
 */
export const toggleVideo = (a) => {
  if (a.dataset.maximized === 'true') {
    closeVideo(a);
  } else {
    showVideo(a);
  }
};


/**
 * Initialize attachments selector
 */
export const initSelectAttachment = () => {
  $('body')
    .on('click', '.attachment .thumbnail', (e) => {
      const a = e.currentTarget;
      const parentPost = a.closest('.post');
      const attachment = a.closest('.attachment');
      if (parentPost.classList.contains('selected') ||
          attachment.classList.contains('attachment_selectable')) {
        const checkbox = a.querySelector('.js-select-attachment');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          $(checkbox).change();          
        }
      }
      e.preventDefault();
    });
};


/**
 * Initialize image viewer
 */
export const initExpandImage = () => {
  $('body')
    .on('click', '.attachment_image.attachment_expandable .thumbnail', (e) => {
      const a = e.currentTarget;
      const parentPost = a.closest('.post');
      if (!parentPost || parentPost.classList.contains('selected')) {
        return;
      }
      toggleImage(a);
      e.preventDefault();
    });
};


/**
 * Initialize video viewer
 */
export const initExpandVideo = () => {
  $('body')
    .on('click', '.attachment_video.attachment_expandable .thumbnail', (e) => {
      const a = e.currentTarget;
      const parentPost = a.closest('.post');
      if (!parentPost || parentPost.classList.contains('selected')) {
        return;
      }
      toggleVideo(a);
      e.preventDefault();
    });
};
