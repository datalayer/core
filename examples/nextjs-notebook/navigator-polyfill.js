/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// Navigator polyfill for server-side rendering
const navigator = {
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
};

module.exports = navigator;
module.exports.default = navigator;
