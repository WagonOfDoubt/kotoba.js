/**
 * Post or thread hide buttons
 * @module  modules/hide-post
 */

import $ from 'jquery';


const boardPostToKey = (board, post) => `${board}/${post}`;
const keyToBoardPost = (key) => key.split('/');


const getHidden = () =>
  JSON.parse(localStorage.getItem('kot_hidden') || '[]');


const addToHidden = (key) =>
  localStorage.setItem('kot_hidden',
    JSON.stringify([key, ...getHidden()]));


const removeFromHidden = (key) =>
  localStorage.setItem('kot_hidden',
    JSON.stringify(getHidden().filter(k => k !== key)));


const hideAllHidden = () =>
  getHidden()
    .map(keyToBoardPost)
    .forEach(([boardUri, postId]) =>
      $(`.post[data-post-id=${postId}][data-board-uri=${boardUri}]`)
        .addClass('post-hidden')
      );


const toggleHidden = (post) => {
  const { boardUri, postId } = post.data();
  const postKey = boardPostToKey(boardUri, postId);
  post.toggleClass('post-hidden');
  if (post.hasClass('post-hidden')) {
    addToHidden(postKey);
  } else {
    removeFromHidden(postKey);
  }
};


/**
 * Initialize module
 */
export const initHidePost = () => {
  hideAllHidden();
  $('body').on('click', '.post-btn-hide', e => {
    const btn = e.currentTarget;
    const post = $(btn).closest('.post');
    toggleHidden(post);
    e.preventDefault();
  });
};
