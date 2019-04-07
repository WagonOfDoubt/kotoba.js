/**
 * Posting form features
 * @module modules/postform
 */

import $ from 'jquery';

const getStoredPassword = () => localStorage.getItem('kot_postpassword');

const setStoredPassword = (pass) => localStorage.setItem('kot_postpassword', pass);

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


/**
 * Initialize module
 */
export const init = () => {
  $('[name=redirectHash]').val(window.location.hash);
  $('input[name="postpassword"]').val(getPassword());
  $('input[name="postpassword"]')
    .closest('form')
    .submit((e) => {
      const form = e.currentTarget;
      setStoredPassword(form.postpassword.value);
    });
};
