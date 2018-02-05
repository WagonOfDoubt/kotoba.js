import $ from 'jquery';

function initExpandVideo() {
  $('body')
    .on('click', '.attachment-video a.thumb-link', (e) => {
      const a = e.currentTarget;
      const { fullSrc, fullWidth, fullHeight,
        thumbSrc, thumbWidth, thumbHeight } = a.dataset;
      const container = $(a).parent();
      if (container.hasClass('thumb-video-playing')) {
        container.removeClass('thumb-video-playing');
        container.find('.video-player').remove();
      } else {
        const player = $('<video>', {
          class: 'video-player',
          poster: thumbSrc,
          autoplay: 'autoplay',
          controls: 'controls',
          loop: 'loop',
          preload: 'auto',
          src: fullSrc
        });
        player
          .prop('muted', true)
          .attr('width', fullWidth)
          .attr('height', fullHeight);

        container.addClass('thumb-video-playing');
        container.append(player);
      }

      e.preventDefault();
    });
}

export { initExpandVideo };
