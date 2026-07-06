import '@testing-library/jest-dom';

// jsdom lacks these browser APIs used by the landing page / components.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = globalThis.IntersectionObserver || IO;

if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {},
  });
}

window.scrollTo = window.scrollTo || (() => {});
