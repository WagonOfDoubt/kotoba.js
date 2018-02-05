import $ from 'jquery';
import { localizeTime } from './time';

export const initExpandThread = () => {
  $('body').on('click', '.post-btn-expthr', e => {
    const thread = $(e.currentTarget).closest('.thread-container');
    const { threadId, boardUri } = thread.data();
    const omitted = thread.find('.omittedposts');
    const replies = thread.find('.replies-container');
    $.ajax({
      url: `/preview/replies/${ boardUri }/${ threadId }`,
      type: 'GET'
    })
      .done((data) => {
        omitted.text('');
        replies.html(data);
        localizeTime(replies);
      })
      .fail((data) => {
        const {status, statusText} = data;
        const errorText = `Something went wrong (${status} ${ statusText})`;
        omitted.text(errorText);
      });
    e.preventDefault();
  });
};
