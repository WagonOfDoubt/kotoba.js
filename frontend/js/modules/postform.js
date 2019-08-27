/**
 * Posting form features
 * @module modules/postform
 */

import $ from 'jquery';


export class PostForm {
  constructor(formEl) {
    this.formEl = formEl;
    this.textarea = formEl.querySelector('[name="message"]');
  }

  init() {
    this.formEl.postpassword.value = getPassword();
    this.formEl.addEventListener('submit', (e) => {
      setStoredPassword(this.formEl.postpassword.value);
    });
  }

  appendLineAndFocus(text) {
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
}


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
    // TODO Quick reply form
    postform.appendLineAndFocus(toReflinkText(post.dataset));
    e.preventDefault();
  });

  if (document.body.classList.contains('thread-page')) {
    $('body').on('click', '.post__header__number__reply', (e) => {
      const link = e.currentTarget;
      const post = link.closest('.post');
      postform.appendLineAndFocus(toReflinkText(post.dataset));
      e.preventDefault();
    });
  }

  insertReflinkOnPageLoad(postform);  
};
