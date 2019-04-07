/**
 * Expanding and playing attachments
 * @module modules/attachment-viewer
 */

import $ from 'jquery';


/**
 * Close full image in image attachment and return to thumbnail view
 * @param  {HTMLElement} a Attachment container
 */
export const minimizeImage = (a) => {
  const thumb = a.querySelector('.thumb');
  const { thumbSrc, thumbWidth, thumbHeight } = a.dataset;
  thumb.setAttribute('width', thumbWidth);
  thumb.setAttribute('height', thumbHeight);
  thumb.setAttribute('src', thumbSrc);
  a.dataset.maximized = 'false';
  return a;
};


/**
 * Show full image in image attachment
 * @param  {HTMLElement} a Attachment container
 */
export const maximizeImage = (a) => {
  const thumb = a.querySelector('.thumb');
  const { fullSrc, fullWidth, fullHeight } = a.dataset;
  thumb.setAttribute('width', fullWidth);
  thumb.setAttribute('height', fullHeight);
  thumb.setAttribute('src', fullSrc);
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
    .from(parentElement.querySelectorAll('.attachment_image a.thumb-link'))
    .map(minimizeImage);
};


/**
 * Close all currently opened full images for all image attachments
 * @param  {HTMLElement} [parentElement=document.body] Root element to search
 *    for attachments
 */
export const maximizeAllImages = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_image a.thumb-link'))
    .map(maximizeImage);
};


/**
 * Show video player in video attachment
 * @param  {HTMLElement} a Attachment container
 */
export const showVideo = (a) => {
  const { fullSrc, fullWidth, fullHeight, thumbSrc } = a.dataset;
  const $container = $(a).parent();
  const $playerContainer = $('<div class="video-container">');
  const $player = $('<video>', {
    class: 'video-player',
    poster: thumbSrc,
    autoplay: 'autoplay',
    controls: 'controls',
    loop: 'loop',
    preload: 'auto',
    src: fullSrc
  });
  $player
    .prop('muted', true)
    .attr('width', fullWidth)
    .attr('height', fullHeight);

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
    .from(parentElement.querySelectorAll('.attachment_video a.thumb-link'))
    .map(closeVideo);
};


/**
 * Show all videos for all video attachments
 * @param  {HTMLElement} [parentElement=document.body] Root element to search
 *    for attachments
 */
export const showAllVideos = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_video a.thumb-link'))
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
    .on('click', '.attachment_selectable a.thumb-link', (e) => {
      const a = e.currentTarget;
      const cb = a.querySelector('.js-select-attachment');
      cb.checked = !cb.checked;
      $(cb).change();
      e.preventDefault();
    });
};


/**
 * Initialize image viewer
 */
export const initExpandImage = () => {
  $('body')
    .on('click', '.attachment_image.attachment_expandable a.thumb-link', (e) => {
      const a = e.currentTarget;
      const $parentPost = $(a).closest('.post');
      if (!$parentPost.hasClass('selected')) {
        toggleImage(a);
      } else {
        const cb = a.querySelector('.js-select-attachment');
        cb.checked = !cb.checked;
        $(cb).change();
      }
      e.preventDefault();
    });
};


/**
 * Initialize video viewer
 */
export const initExpandVideo = () => {
  $('body')
    .on('click', '.attachment_video.attachment_expandable a.thumb-link', (e) => {
      const a = e.currentTarget;
      const $parentPost = $(a).closest('.post');
      if (!$parentPost.hasClass('selected')) {
        toggleVideo(a);
      } else {
        const cb = a.querySelector('.js-select-attachment');
        cb.checked = !cb.checked;
        $(cb).change();
      }
      e.preventDefault();
    });
};
