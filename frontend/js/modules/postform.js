/**
 * Posting form features
 * @module modules/postform
 */

import $ from 'jquery';
import quickReplyPostareaTemplate from '../templates-compiled/postarea';


export class PostForm {
  constructor(formEl) {
    this.formEl = formEl;
    this.textarea = formEl.querySelector('[name="message"]');
    this._quickReplyPost = null;

    const $quickReplyContainer = $(quickReplyPostareaTemplate({}));
    this.quickReplyContainer = $quickReplyContainer[0];
    this.quickReplyPostarea = this.quickReplyContainer.querySelector('.postarea');
  }

  init() {
    this.formEl.postpassword.value = getPassword();
    this.formEl.addEventListener('submit', (e) => {
      setStoredPassword(this.formEl.postpassword.value);
    });
    this.hide();
  }

  appendLineAndFocus(text) {
    this.show();
    const t = this.textarea;
    t.focus();
    text = `${text}\n`;
    if (!t.value.endsWith(text)) {
      if (t.value.length && !t.value.endsWith('\n')) {
        text = '\n' + text;
      }
      t.setRangeText(text, t.textLength, t.textLength, 'end');
    }
  }

  getCurrentToggleBtn() {
    if (!this.formEl.parentElement) {
      return null;
    }
    const postarea = this.formEl.closest('.postarea');
    if (!postarea || postarea === this.quickReplyPostarea) {
      return null;
    }
    const toggleBtn = postarea.querySelector('.js-toggle-postform');
    return toggleBtn;
  }

  togglePostarea(postarea) {
    this._quickReplyPost = null;
    this.replyThread = getPageReplyThread();
    if (postarea.contains(this.formEl)) {
      this.toggle();
    } else {
      this.moveToPostarea(postarea);
      this.show();
    }
  }

  moveToPostarea(postarea) {
    const oldBtn = this.getCurrentToggleBtn();
    if (oldBtn) {
      oldBtn.innerText = getToggleBtnLabel(false);
    }
    postarea.appendChild(this.formEl);
  }

  moveAfterPost(postEl) {
    const replyContainer = postEl.closest('.reply-container');
    if (replyContainer) {
      replyContainer.insertAdjacentElement('afterend', this.quickReplyContainer);
    } else {
      const threadContainer = postEl.closest('.thread-container');
      const repliesContainer = threadContainer.querySelector('.replies-container');
      repliesContainer.insertAdjacentElement('afterbegin', this.quickReplyContainer);
    }
    this.moveToPostarea(this.quickReplyPostarea);
    this.replyThread = postEl.dataset;
    this._quickReplyPost = postEl;
    this.show();
  }

  hide() {
    this.formEl.classList.add('hidden');
    const btn = this.getCurrentToggleBtn();
    if (btn) {
      btn.innerText = getToggleBtnLabel(this.isVisible);
    }
    this.quickReplyContainer.classList.add('hidden');
  }

  show() {
    this.formEl.classList.remove('hidden');
    const btn = this.getCurrentToggleBtn();
    if (btn) {
      btn.innerText = getToggleBtnLabel(this.isVisible);
    }
    this.quickReplyContainer.classList.toggle('hidden',
      !this.quickReplyContainer.contains(this.formEl));
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  get isVisible() {
    return !this.formEl.classList.contains('hidden');
  }

  set isVisible(value) {
    if (value) {
      this.show();
    } else {
      this.hide();
    }
  }

  get quickReplyPost() {
    return this._quickReplyPost;
  }

  get replyThread() {
    return {
      boardUri: this.formEl.board.value,
      threadId: this.formEl.replythread.value,
    };
  }

  set replyThread({boardUri, threadId}) {
    this.formEl.board.value = boardUri;
    this.formEl.replythread.value = threadId;
    const replytoHeader = this.quickReplyPostarea
      .querySelector('.postarea__header__title');
    if (replytoHeader) {
      replytoHeader.innerText = `Reply in thread >>/${boardUri}/${threadId}`;
    }
  }
}


const isThreadPage = () => document.body.classList.contains('thread-page');


const getToggleBtnLabel = (isVisible) => {
  if (isVisible) {
    return 'Hide form';
  }
  if (isThreadPage()) {
    return 'Reply';
  }
  return 'Create thread';
};


const getPageReplyThread = () => {
  const threadId = document.documentElement.dataset.thread || '0';
  const boardUri = document.documentElement.dataset.board || '';
  return { boardUri, threadId };
};


const getStoredPassword = () =>
  localStorage.getItem('kot_postpassword');

const setStoredPassword = (pass) =>
  localStorage.setItem('kot_postpassword', pass);

const getRandomPassword = (length = 8) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charsLength = chars.length;
  return [...Array(length)]
    .map(() => chars[Math.floor(Math.random() * charsLength)])
    .join('');
};

const getPassword = () => {
  const storedPass = getStoredPassword();
  if (storedPass) {
    return storedPass;
  }

  const randomPass = getRandomPassword(8);
  setStoredPassword(randomPass);
  return randomPass;
};


const toReflinkText = ({postId, boardUri}) => {
  return `>>${postId}`;
};


const insertReflinkOnPageLoad = (postform) => {
  const query = window.location.href.split('?')[1];
  if (!query) {
    return;
  }
  const searchParams = new URLSearchParams(query);
  if (!searchParams.has('r')) {
    return;
  }

  const postString = searchParams.get('r');
  const [ p, boardUri, postId ] = postString.split('-');
  postform.appendLineAndFocus(toReflinkText({ postId }));
  window.location.hash = '#postbox';
};


/**
 * Initialize module
 */
export const init = () => {
  const formEl = document.body.querySelector('#postform');
  if (!formEl) {
    return;
  }
  const postform = new PostForm(formEl);
  postform.init();

  $('body').on('click', '.post__button_reply', (e) => {
    const btn = e.currentTarget;
    const post = btn.closest('.post');
    const postformReply = postform.quickReplyPost;
    if (postformReply === post) {
      postform.toggle();
    } else {
      postform.moveAfterPost(post);
      postform.appendLineAndFocus(toReflinkText(post.dataset));      
    }
    e.preventDefault();
  });

  if (isThreadPage()) {
    $('body').on('click', '.post__header__number__reply', (e) => {
      const link = e.currentTarget;
      const post = link.closest('.post');
      postform.appendLineAndFocus(toReflinkText(post.dataset));
      e.preventDefault();
    });
  }

  $('body').on('click', '.js-toggle-postform', (e) => {
    const postarea = e.target.closest('.postarea');
    postform.togglePostarea(postarea);
    e.preventDefault();
  });

  insertReflinkOnPageLoad(postform);
};
