/**
 * Event utils module
 * @module utils/event-utils
 */

function* parentNodeGenerator(rootElement, targetElement) {
  if (!rootElement.contains(targetElement)) {
    throw new Error('rootElement is not an ancestor of targetElement');
  }
  while (targetElement) {
    yield targetElement;
    targetElement = targetElement.parentNode;
    if (targetElement === rootElement) {
      yield targetElement;
      return;
    }
  }
}


const addListener = (type, target, selector, listener) => {
  target.addEventListener(type, (e) => {
    const parentNodes = parentNodeGenerator(target, e.target);
    for (let t of parentNodes) {
      if (!selector || t.matches(selector)) {
        listener.call(t, e);
        break;
      }
    }
  });
};


const on = (types, target, selector, listener) => {
  types
    .split(' ')
    .forEach((type) => addListener(type, target, selector, listener));
};

export { on };
