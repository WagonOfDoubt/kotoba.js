import $ from 'jquery';
import boardListItemTemplate from '../templates-compiled/board-list-item.js';


const getBoards = () =>
  JSON.parse(localStorage.getItem('kot_boards') || '{}');

const setBoards = (data) =>
  localStorage.setItem('kot_boards', JSON.stringify(data));


const addToFavBoards = (boardUri) => {
  const data = getBoards();
  const boardData = data[boardUri];
  boardData.isFavorite = true;
  data[boardUri] = boardData;
  setBoards(data);

  $(`.boards-menu__boards-list li[data-uri="${boardUri}"]`).addClass('board-list__item_fav');
  const $favBoardItem = $(boardListItemTemplate({board: boardData}));
  $(`.boards-menu__favboards-list`).append($favBoardItem);
};


const removeFromFavBoards = (boardUri) => {
  const data = getBoards();
  if (data[boardUri]) {
    data[boardUri].isFavorite = false;
    $(`.boards-menu__boards-list li[data-uri="${boardUri}"]`).removeClass('board-list__item_fav');
    $(`.boards-menu__favboards-list li[data-uri="${boardUri}"]`).remove();
  }
  setBoards(data);
};


const fetchBoards = () => {
  const endpoint = '/api/board';
  const select = [
      'uri',
      'name',
      'desc',
      'isHidden',
      'isLocked',
      // 'isForcedAnon',
      'postcount',
    ].join(' ');
  const sort = [
      '-postcount'
    ].join(' ');
  return fetch(`${endpoint}?select=${select}&sort=${sort}`)
    .then((response) => {
      if(response.ok) {
        return response.json();
      }
      throw new Error(response.statusText);
    })
    .then(obj => {
      if (obj.docs && obj.docs.length) {
        return obj.docs;
      }
      throw new Error('No boards in response');
    });
};


const resetPostcountOnCurrentBoard = () => {
  const currentBoard = document.documentElement.dataset.board;
  const currentPostcount = document.documentElement.dataset.postcount;
  const cachedBoards = getBoards();
  if(!cachedBoards[currentBoard]) {
    cachedBoards[currentBoard] = {};
  }
  cachedBoards[currentBoard].lastVisitPostcount = parseInt(currentPostcount);
  setBoards(cachedBoards);
};


const populateBoardLists = (boards) => {
  if (!boards) {
    return;
  }
  for (const board of Object.values(boards)) {
    if (board.isFavorite) {
      const $boardItem = $(boardListItemTemplate({board}));
      $(`.boards-menu__favboards-list`).append($boardItem);
    }
    const $boardItem = $(boardListItemTemplate({board}));
    $(`.boards-menu__boards-list`).append($boardItem);
  }
};


const populateAndUpdateBoardLists = () => {
  fetchBoards()
    .then(boards => {
      const cachedBoards = getBoards();
      const groupedBoards = {};
      for (const board of Object.values(boards)) {
        const chachedBoard = cachedBoards[board.uri];
        const boardItem = {...board};
        if (chachedBoard) {
          if (chachedBoard.isFavorite) {
            boardItem.isFavorite = chachedBoard.isFavorite;
          }
          if (chachedBoard.lastVisitPostcount) {
            boardItem.lastVisitPostcount = chachedBoard.lastVisitPostcount;
          }
        }
        groupedBoards[board.uri] = boardItem;
      }
      setBoards(groupedBoards);
      populateBoardLists(groupedBoards);
    })
    .catch(err => {
      console.warn(`Can't fetch list of boards`, err);
      const cachedBoards = getBoards();
      populateBoardLists(cachedBoards);
    });
};


export const initBoardsList = () => {
  resetPostcountOnCurrentBoard();
  populateAndUpdateBoardLists();

  $('body').on('click', '.board-list__button_togglefav', (e) => {
    e.preventDefault();
    const $boardItem = $(e.target).closest('.boards-list__item');
    const data = $boardItem.data();
    if (!data.uri) {
      return;
    }
    const isFavorite = $boardItem.hasClass('board-list__item_fav');
    if (isFavorite) {
      removeFromFavBoards(data.uri);
    } else {
      addToFavBoards(data.uri);
    }
    console.log($boardItem.data());
  });
};
