import $ from 'jquery';
import expandBtnTemplate from '../templates-compiled/post-expand-btn';


const appendExpandBtn = (postBody) => {
  postBody.insertAdjacentHTML('beforeend', expandBtnTemplate({ isInitiallyHidden: true }));
};


const onExpandBtnClick = (e) => {
  e.preventDefault();
  const target = e.currentTarget;
  const postBody = target.closest('.post__body');
  if (!postBody) {
    return;
  }
  if (target.isVisible === 'true') {
    target.isVisible = 'false';
    target.innerText = target.dataset.captionShow;
    postBody.classList.remove('post__body_expaned');
  } else {
    target.isVisible = 'true';
    target.innerText = target.dataset.captionHide;      
    postBody.classList.add('post__body_expaned');
  }
};


export const initExpandPost = () => {
  $('.post__body').each((i, postBody) => {
    const block = postBody.querySelector('blockquote');
    if (!block) {
      return;
    }
    if (block && block.scrollHeight > block.clientHeight) {
      appendExpandBtn(postBody);
    }
  });
  $(document.body).on('click', '.js-toggle-expand', onExpandBtnClick);
};
