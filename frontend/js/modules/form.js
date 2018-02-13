import $ from 'jquery';

const getStoredPassword = () => localStorage.getItem('kot_postpassword');

const setStoredPassword = (pass) => localStorage.setItem('kot_postpassword', pass);

const getRandomPassword = (length) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array(8)
    .fill(0)
    .map(() => Math.floor(Math.random() * chars.length))
    .map(rnd => chars[rnd])
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

export const init = () => {
  $('input[name="postpassword"]').val(getPassword());
  $('input[name="postpassword"]')
    .closest('form')
    .submit((e) => {
      const form = e.currentTarget;
      setStoredPassword(form.postpassword.value);
    });
};
