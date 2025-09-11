/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Comprehensive browser polyfills for server-side rendering

// Event polyfill
const createEvent = type => ({
  type,
  bubbles: true,
  cancelable: true,
  preventDefault: () => {},
  stopPropagation: () => {},
  stopImmediatePropagation: () => {},
  target: null,
  currentTarget: null,
});

// Event target polyfill
const createEventTarget = () => ({
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  ownerDocument: null,
  parentNode: null,
  childNodes: [],
  firstChild: null,
  lastChild: null,
  nextSibling: null,
  previousSibling: null,
});

// Document polyfill
const document = {
  ...createEventTarget(),
  createElement: tagName => ({
    ...createEventTarget(),
    tagName: tagName.toUpperCase(),
    innerHTML: '',
    textContent: '',
    style: {},
    setAttribute: () => {},
    getAttribute: name => {
      // Return expected values for common JupyterLab attributes
      if (name === 'data-jupyter-widgets-dir') return null;
      if (name === 'data-jupyter-config-dir') return null;
      return null;
    },
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    getElementsByClassName: () => [],
    getElementById: () => null,
    click: () => {},
    focus: () => {},
    blur: () => {},
    // Add JupyterLab specific properties that might be accessed during static generation
    deferredExtensions: [],
    disabledExtensions: [],
    dataset: {},
  }),
  getElementById: () => null,
  getElementsByTagName: () => [],
  getElementsByClassName: () => [],
  querySelector: () => null,
  querySelectorAll: () => [],
  body: {
    ...createEventTarget(),
    style: {},
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  head: {
    ...createEventTarget(),
    appendChild: () => {},
    removeChild: () => {},
  },
  documentElement: {
    ...createEventTarget(),
    style: {},
  },
  location: {
    href: '',
    protocol: 'https:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
  },
  cookie: '',
  readyState: 'complete',
  title: '',
  createEvent: type => createEvent(type),
  // Add properties that might be accessed during static generation
  defaultView: null,
  parentWindow: null,
};

// Window polyfill
const window = {
  navigator: {
    userAgent: 'Mozilla/5.0 (compatible; Node.js)',
    platform: 'Node.js',
    language: 'en-US',
    languages: ['en-US', 'en'],
    onLine: true,
    cookieEnabled: false,
    doNotTrack: null,
    maxTouchPoints: 0,
    hardwareConcurrency: 4,
    javaEnabled: () => false,
    taintEnabled: () => false,
    appName: 'Netscape',
    appVersion: '5.0',
    appCodeName: 'Mozilla',
    product: 'Gecko',
    productSub: '20030107',
    vendor: '',
    vendorSub: '',
    buildID: '',
    oscpu: '',
  },
  document,
  location: document.location,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1024,
  innerHeight: 768,
  outerWidth: 1024,
  outerHeight: 768,
  screen: {
    width: 1024,
    height: 768,
    availWidth: 1024,
    availHeight: 768,
  },
  matchMedia: () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
  }),
  getComputedStyle: () => ({}),
  requestAnimationFrame: callback => setTimeout(callback, 16),
  cancelAnimationFrame: id => clearTimeout(id),
};

// Global polyfill
const global = {
  window,
  document,
  navigator: window.navigator,
  localStorage: window.localStorage,
  sessionStorage: window.sessionStorage,
};

module.exports = {
  window,
  document,
  navigator: window.navigator,
  global,
  localStorage: window.localStorage,
  sessionStorage: window.sessionStorage,
};
