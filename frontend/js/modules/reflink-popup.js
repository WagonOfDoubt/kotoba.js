/**
 * Feature of showing related post when mouse hovers over reflink
 * @module modules/reflink-popup
 */


import $ from 'jquery';
import popupTemplate from '../templates-compiled/popup';
import { localizeTime } from './time';


/** Popup class */
class ReflinkPopup {
  /**
   * Create popup
   * @param  {HTMLElement} reflink Reflink that triggers this popup
   * @param  {Number} index   Index of this popup in chain
   */
  constructor(reflink, index=0) {
    this.reflink = reflink;
    const { post, board } = reflink.dataset;
    this.postId = post;
    this.boardUri = board;
    this.popupIndex = index;
    this.constructRootContainer();
    this.constructElement();
    this.loadContent();
    this.reflink.dataset.popupIndex = index;
    this.active = true;
    this.tail = false;
    this.hideTimeoutId = undefined;
  }

  /**
   * Create container for all popups add add on page, if its missing
   */
  constructRootContainer() {
    let container = document.querySelector('.popups-container');
    if (!container) {
      container = document.createElement('div');
      container.classList.add('popups-container');
      document.body.appendChild(container);
    }
  }

  /**
   * Crate popup div and place on page near it's reflink
   */
  constructElement() {
    const popup = $(popupTemplate())[0];
    popup.dataset.post = this.postId;
    popup.dataset.board = this.boardUri;
    popup.dataset.popupIndex = this.popupIndex;
    $(popup).css(this.getPopupOffsetCSS());
    $('.popups-container').append(popup);
    this.element = popup;
  }

  /**
   * Load popup content from server
   */
  loadContent() {
    if (ReflinkPopup.cache[this.key]) {
      const body = ReflinkPopup.cache[this.key];
      this.displayContent(body);
      return;
    }
    const previewUrl = `/preview/post/${ this.boardUri }/${ this.postId }`;
    fetch(previewUrl)
      .then(response => {
        if (response.ok) {
          return response.text();
        } else {
          console.log(response);
          return popupTemplate({ error: response });
        }
      })
      .then(body => {
        ReflinkPopup.cache[this.key] = body;
        this.displayContent(body);
      });
  }

  /**
   * Set inner HTML of popup and initialize content
   * @param  {string} body DOMString
   */
  displayContent(body) {
    this.element.innerHTML = body;
    this.element.classList.add('popup_loaded');
    localizeTime(this.element);
  }

  /**
   * Is mouse over this popup or it's reflink
   * @type {boolean}
   */
  set active(val) {
    this._active = !!val;
  }

  get active() {
    return this._active;
  }

  /**
   * Is this popup stand after last active popup in chain, thus should be
   *    removed
   * @type {boolean}
   */
  set tail(val) {
    val = !!val;
    if (this._tail === val) {
      return;
    }
    this._tail = !!val;
    if (this._tail) {
      this.element.classList.add('popup_tail');
      const fn = this.destroy.bind(this);
      this.hideTimeoutId = window.setTimeout(fn, ReflinkPopup.POPUP_HIDE_DELAY);
    } else {
      this.element.classList.remove('popup_tail');
      if (this.hideTimeoutId !== undefined) {
        window.clearTimeout(this.hideTimeoutId);
        this.hideTimeoutId = undefined;        
      }
    }
  }

  get tail() {
    return this._tail;
  }

  /**
   * Remove popup from page
   */
  destroy() {
    this.element.remove();
    this.reflink.dataset.popupIndex = '';
  }

  /**
   * Get best position for placement of popup on page, depending on where on
   * screen reflink is located
   * @return {Object} { top, left, bottom, right }
   */
  getPopupOffsetCSS() {
    const baseOffset = this.getBaseOffset();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;
    const screenX = baseOffset.offsetLeft - scrollX;
    const screenY = baseOffset.offsetTop - scrollY;
    const windowWidth = document.documentElement.clientWidth;
    const windowHeight = document.documentElement.clientHeight;
    // is vertical orientation
    const isVertical = windowHeight > windowWidth;
    // line (in %) where divide screen left/right and top/bottom
    let verticalSeparator   = ReflinkPopup.SCREEN_SEPARATOR_Y_HORIZONTAL;
    let horizontalSeparator = ReflinkPopup.SCREEN_SEPARATOR_X_HORIZONTAL;
    if (isVertical) {
      verticalSeparator   = ReflinkPopup.SCREEN_SEPARATOR_Y_VERTICAL;
      horizontalSeparator = ReflinkPopup.SCREEN_SEPARATOR_X_VERTICAL;
    }
    // reflink is in top part of screen
    const isTop = screenY / windowHeight < horizontalSeparator;
    // reflink is in left part of screen
    const isLeft = screenX / windowWidth < verticalSeparator;

    let alignVertical = isTop ? 'bottom' : 'top';
    let alignHorizontal = 'center';

    const refOffset = this.getReflinkOffset(alignVertical, alignHorizontal);
    const offsetTop = baseOffset.offsetTop + refOffset.offsetTop;
    const offsetLeft = baseOffset.offsetLeft + refOffset.offsetLeft;
    const pageHeight = document.documentElement.scrollHeight;
    const pageWidth = document.documentElement.scrollWidth;

    const css = {};
    
    if (isTop) {
      css.top = offsetTop;
    } else {
      css.bottom = pageHeight - offsetTop;
    }

    if (isLeft) {
      css.left = offsetLeft;
    } else {
      css.right = pageWidth - offsetLeft;
    }

    css.transformOrigin = isTop ? 'top ' : 'bottom ';
    css.transformOrigin += isLeft ? 'left' : 'right';

    return css;
  }

  /**
   * Get absolute position of reflink on page
   * @return {Object} { offsetTop, offsetLeft }
   */
  getBaseOffset() {
    let r = this.reflink;
    const offset = {
      offsetTop: r.offsetTop,
      offsetLeft: r.offsetLeft,
    };
    while (r.offsetParent) {
      r = r.offsetParent;
      offset.offsetTop += r.offsetTop;
      offset.offsetLeft += r.offsetLeft;
    }
    return offset;
  }

  /**
   * Get position of point on bounding box of reflink
   * @param  {string} positionY ['top', 'middle', 'bottom']
   * @param  {string} positionX ['left', 'center', 'right']
   * @return {Object}           { offsetTop, offsetLeft }
   */
  getReflinkOffset(positionY, positionX) {
    const offset = {
      offsetTop: 0,
      offsetLeft: 0,
    };
    if (positionY === 'middle') {
      offset.offsetTop = this.reflink.offsetHeight / 2;
    } else if (positionY === 'bottom') {
      offset.offsetTop = this.reflink.offsetHeight;
    }
    if (positionX === 'center') {
      offset.offsetLeft = this.reflink.offsetWidth / 2;
    } else if (positionY === 'right') {
      offset.offsetLeft = this.reflink.offsetWidth;
    }
    return offset;
  }

  /**
   * Unique id of post displayed by this popup, containing values
   *    "{board}-{post}", i.e. "b-123"
   * @type {string}
   */
  get key() {
    return `${this.boardUri}-${this.postId}`;
  }
}


/**
 * HTML cache of popup content retrieved from server, keys are "{board}-{post}",
 * i.e. "b-123", values are strings of HTML
 * @static
 * @type {Object}
 */
ReflinkPopup.cache = {};

/**
 * Delay (ms) after mouse leaves popup or it's reflink before popup disappears
 * @static
 * @type {Number}
 */
ReflinkPopup.POPUP_HIDE_DELAY = 1000;

/**
 * Delay (ms) after mouse hovers over reflink before popup appears
 * @static
 * @type {Number}
 */
ReflinkPopup.POPUP_SHOW_DELAY = 300;


/**
 * Where to divide screen into left/right part (in %) for horizontal screen
 *    orientation. Defines popup placement.
 * @type {Number}
 */
ReflinkPopup.SCREEN_SEPARATOR_X_HORIZONTAL = 0.70;

/**
 * Where to divide screen into left/right part (in %) for vertical screen
 *    orientation. Defines popup placement.
 * @type {Number}
 */
ReflinkPopup.SCREEN_SEPARATOR_X_VERTICAL = 0.50;

/**
 * Where to divide screen into top/bottom part (in %) for horizontal screen
 *    orientation. Defines popup placement.
 * @type {Number}
 */
ReflinkPopup.SCREEN_SEPARATOR_Y_HORIZONTAL = 0.95;

/**
 * Where to divide screen into top/bottom part (in %) for vertical screen
 *    orientation. Defines popup placement.
 * @type {Number}
 */
ReflinkPopup.SCREEN_SEPARATOR_Y_VERTICAL = 0.90;


const popupChain = [];


const findLastActivePopup = () => {
  let passedActive = false;
  for (let i = popupChain.length - 1; i >= 0; i--) {
    let popup = popupChain[i];
    passedActive = passedActive || popup.active;
    popup.tail = !passedActive;
  }
};


const clearPopupChain = (len) => {
  while (popupChain.length > len) {
    let popup = popupChain.pop();
    popup.destroy();
  }
};


export const initReflinks = () => {
  let popupCreationTimeout;
  let pendingReflink;

  function createPopup() {
    pendingReflink = null;
    let parentPopup = this;
    while (parentPopup && !parentPopup.classList.contains('popup')) {
      parentPopup = parentPopup.parentElement;
    }
    if (!parentPopup) {
      clearPopupChain(0);
    } else {
      const parentPopupIndex = parseInt(parentPopup.dataset.popupIndex) + 1;
      clearPopupChain(parentPopupIndex);
    }
    const popup = new ReflinkPopup(this, popupChain.length);
    popupChain.push(popup);
  }

  $(document.body).on('mouseenter', '.js-reflink-popup, .popup', (e) => {
    let target = e.target;
    while (target && !(target.classList.contains('js-reflink-popup') || target.classList.contains('popup'))) {
      target = target.parentElement;
    }
    if (!target) {
      return;
    }

    const { post, board, popupIndex } = target.dataset;

    const popup = popupIndex !== '' && popupChain[parseInt(popupIndex)];
    if (popup) {
      popup.active = true;
      popup.tail = false;
    } else if (target.classList.contains('js-reflink-popup')) {
      if (pendingReflink !== target) {
        window.clearTimeout(popupCreationTimeout);
        const fn = createPopup.bind(target);
        popupCreationTimeout = window.setTimeout(fn, ReflinkPopup.POPUP_SHOW_DELAY);
        pendingReflink = target;
      }
    }
    findLastActivePopup();
  });

  $(document.body).on('mouseleave', '.js-reflink-popup, .popup', (e) => {
    let target = e.target;
    while (target && !(target.classList.contains('js-reflink-popup') || target.classList.contains('popup'))) {
      target = target.parentElement;
    }
    if (!target) {
      return;
    }

    const { post, board, popupIndex } = target.dataset;

    let popup = popupIndex !== '' && popupChain[parseInt(popupIndex)];
    if (popup) {
      popup.active = false;
    } else if (target.classList.contains('js-reflink-popup')) {
      if (pendingReflink) {
        window.clearTimeout(popupCreationTimeout);
        pendingReflink = null;
      }
    }
    findLastActivePopup();
  });
};
