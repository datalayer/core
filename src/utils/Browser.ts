/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

// https://stackoverflow.com/questions/49328382/browser-detection-in-reactjs
// https://codepedia.info/detect-browser-in-javascript

export const detectBrowser = () => {
  const userAgent = navigator.userAgent;
  let browserName;
  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "chrome";
  }
  else if(userAgent.match(/firefox|fxios/i)){
    browserName = "firefox";
  }
  else if(userAgent.match(/safari/i)){
    browserName = "safari";
  }
  else if(userAgent.match(/opr\//i)){
    browserName = "opera";
  }
  else if(userAgent.match(/edg/i)){
    browserName = "edge";
  }
  else {
    browserName="Unknow browser.";
  }
  return browserName;
}

// TODO Is this a duplicate of detectBrowser ?
export function getBrowserType() {
  const test = (regexp: RegExp) => {
    return regexp.test(navigator.userAgent);
  };

  if (test(/opr\//i)) {
    return 'Opera';
  } else if (test(/edg/i)) {
    return 'Microsoft Edge';
  } else if (test(/chrome|chromium|crios/i)) {
    return 'Google Chrome';
  } else if (test(/firefox|fxios/i)) {
    return 'Mozilla Firefox';
  } else if (test(/safari/i)) {
    return 'Apple Safari';
  } else if (test(/trident/i)) {
    return 'Microsoft Internet Explorer';
  } else if (test(/ucbrowser/i)) {
    return 'UC Browser';
  } else if (test(/samsungbrowser/i)) {
    return 'Samsung Browser';
  } else {
    return 'Unknown browser';
  }
}

export default detectBrowser;
