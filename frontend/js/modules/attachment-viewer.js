import $ from 'jquery';

export const minimizeImage = (a) => {
  const thumb = a.querySelector('.thumb');
  const { thumbSrc, thumbWidth, thumbHeight } = a.dataset;
  thumb.setAttribute('width', thumbWidth);
  thumb.setAttribute('height', thumbHeight);
  thumb.setAttribute('src', thumbSrc);
  a.dataset.maximized = 'false';
  return a;
};

export const maximizeImage = (a) => {
  const thumb = a.querySelector('.thumb');
  const { fullSrc, fullWidth, fullHeight } = a.dataset;
  thumb.setAttribute('width', fullWidth);
  thumb.setAttribute('height', fullHeight);
  thumb.setAttribute('src', fullSrc);
  a.dataset.maximized = 'true';
  return a;
};

export const toggleImage = (a) => {
  if (a.dataset.maximized === 'true') {
    minimizeImage(a);
  } else {
    maximizeImage(a);
  }
};

export const minimizeAllImages = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_image a.thumb-link'))
    .map(minimizeImage);
};

export const maximizeAllImages = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_image a.thumb-link'))
    .map(maximizeImage);
};

export const showVideo = (a) => {
  const { fullSrc, fullWidth, fullHeight, thumbSrc } = a.dataset;
  const $container = $(a).parent();
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
  $container.append($player);
  a.dataset.maximized = 'true';
};

export const closeVideo = (a) => {
  const $container = $(a).parent();
  $container.removeClass('attachment_video_playing');
  $container.find('.video-player').remove();
  a.dataset.maximized = 'false';
};

export const closeAllVideos = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_video a.thumb-link'))
    .map(closeVideo);
};

export const showAllVideos = (parentElement = document.body) => {
  return Array
    .from(parentElement.querySelectorAll('.attachment_video a.thumb-link'))
    map(closeVideo);
};

export const toggleVideo = (a) => {
  if (a.dataset.maximized === 'true') {
    closeVideo(a);
  } else {
    showVideo(a);
  }
};

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
