/**
 * Thread "Star" button and Favorites panel
 * @module modules/favorites
 */
import $ from 'jquery';
import favoritesPanelTemplate from '../templates-compiled/watched-threads-list.js';
import favoritesItemTemplate from '../templates-compiled/watched-threads-item.js';
import favoritesBoardTemplate from '../templates-compiled/watched-threads-board.js';


const getWatched = () =>
  JSON.parse(localStorage.getItem('kot_watched') || '{}');

const setWatched = (data) =>
  localStorage.setItem('kot_watched', JSON.stringify(data));


const addToWatched = (boardUri, threadId, threadData) => {
  const data = getWatched();
  if (!data[boardUri]) {
    data[boardUri] = {};
  }
  data[boardUri][threadId] = threadData;
  setWatched(data);
  const currentBoard = document.documentElement.dataset.board;
  const $favMenu = $('#favorites-menu');
  const $category = $favMenu.find(`.favorites__board[data-board=${boardUri}]`);
  if (!$category.length) {
    const threads = data[boardUri];
    $favMenu.append($(favoritesBoardTemplate({threads, boardUri, currentBoard})));
  } else {
    const thread = threadData;
    $category.find('.favlist').append($(favoritesItemTemplate({thread, boardUri, threadId})));
  }
};


const removeFromWatched = (boardUri, threadId) => {
  const data = getWatched();
  if (data[boardUri]) {
    delete data[boardUri][threadId];
    const $favMenu = $('#favorites-menu');
    if (!Object.keys(data[boardUri]).length) {
      delete data[boardUri];
      $favMenu
        .find(`.favorites__board[data-board=${boardUri}]`)
        .remove();
    } else {
      $favMenu
        .find(`.favorites__thread[data-board=${boardUri}][data-thread=${threadId}]`)
        .remove();
    }
  }
  setWatched(data);

};


const renderWatchedThreadsList = (data) => {
  const currentBoard = document.documentElement.dataset.board;
  const html = favoritesPanelTemplate({data, currentBoard});
  $('#favorites-menu').html(html);
};


const initWatchedThreadsState = () => {
  const data = getWatched();
  $('.thread').each((i, t) => {
    const {boardUri, threadId} = t.dataset;
    const isWatched = !!(data && data[boardUri] && data[boardUri][threadId]);
    t.classList.toggle('thread_watched', isWatched);
  });
};


const toggleWatched = ($thread) => {
  const { boardUri, threadId } = $thread.data();
  const threadSubject = $thread.find('.post_op .post__header__subject').text();
  const threadBody = $thread.find('.post_op .post__body').text();
  const threadData = {
    txt: (threadSubject || threadBody || '[no text]').substr(0, 100)
  };
  $thread.toggleClass('thread_watched');
  if ($thread.hasClass('thread_watched')) {
    addToWatched(boardUri, threadId, threadData);
  } else {
    removeFromWatched(boardUri, threadId);
  }
};


export const initFavorites = () => {
  initWatchedThreadsState();
  renderWatchedThreadsList(getWatched());
  $('body').on('click', '.post__button_favorite', (e) => {
    e.preventDefault();
    const $thread = $(e.currentTarget).closest('.thread');
    if (!$thread.length) {
      return;
    }
    toggleWatched($thread);
  });
  $('body').on('click', '.js-toggle-watched', (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const {thread, board} = btn.dataset;
    removeFromWatched(board, thread);
  });
};
