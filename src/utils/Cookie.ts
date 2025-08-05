/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Get a cookie from the document.
 */
export function getCookie(cname: string): string | undefined {
  // From http://www.tornadoweb.org/en/stable/guide/security.html
  let cookie: string | undefined;
  try {
    cookie = document.cookie;
  } catch (e) {
    // e.g. SecurityError in case of CSP Sandbox
    return cookie as undefined;
  }
  // From https://www.w3schools.com/js/js_cookies.asp
  const name = cname + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
}

/**
 * Set a cookie in the document.
 */
export function setCookie(name: string, value: string, path: string = '/') {
//  document.cookie = "username=John Doe; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/";
  const expire = new Date();
  const time = expire.getTime();
  const expireTime = time + 1000*36000;
  expire.setTime(expireTime);
  document.cookie = `${name}=${value}; expires=${expire.toUTCString()}; SameSite=Lax; path=${path}`;
}

/**
 * Set a cookie in the document.
 */
export function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`; 
}
