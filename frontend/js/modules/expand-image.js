import $ from 'jquery';

function initExpandImage() {
  $('body')
    .on('click', '.attachment-image a.thumb-link', (e) => {
      const a = e.currentTarget;
      const { fullSrc, fullWidth, fullHeight,
        thumbSrc, thumbWidth, thumbHeight } = a.dataset;
      const thumb = a.querySelector('.thumb');
      const isFull = thumb.getAttribute('src') === fullSrc;
      if (isFull) {
        thumb.setAttribute('width', thumbWidth);
        thumb.setAttribute('height', thumbHeight);
        thumb.setAttribute('src', thumbSrc);
      } else {
        thumb.setAttribute('width', fullWidth);
        thumb.setAttribute('height', fullHeight);
        thumb.setAttribute('src', fullSrc);
      }
      e.preventDefault();
    });
}

export { initExpandImage };
