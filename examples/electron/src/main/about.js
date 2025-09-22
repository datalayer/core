/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * About dialog functionality
 * This script runs in the renderer context with context isolation enabled
 */

// DOM loaded event
document.addEventListener('DOMContentLoaded', () => {
  // Version information is populated by the preload script

  // Update copyright year to current year
  const currentYear = new Date().getFullYear();
  const copyrightYearElement = document.getElementById('copyright-year');
  if (copyrightYearElement) {
    copyrightYearElement.textContent = currentYear.toString();
  }

  // Add event listeners for buttons
  const websiteBtn = document.querySelector('[data-action="website"]');
  const docsBtn = document.querySelector('[data-action="docs"]');
  const githubBtn = document.querySelector('[data-action="github"]');
  const closeBtn = document.querySelector('[data-action="close"]');

  if (websiteBtn) {
    websiteBtn.addEventListener('click', () => {
      if (window.aboutAPI) {
        window.aboutAPI.openExternal('https://datalayer.io');
      }
    });
  }

  if (docsBtn) {
    docsBtn.addEventListener('click', () => {
      if (window.aboutAPI) {
        window.aboutAPI.openExternal('https://docs.datalayer.io');
      }
    });
  }

  if (githubBtn) {
    githubBtn.addEventListener('click', () => {
      if (window.aboutAPI) {
        window.aboutAPI.openExternal('https://github.com/datalayer/core');
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.aboutAPI) {
        window.aboutAPI.close();
      }
    });
  }

  // Close on ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (window.aboutAPI) {
        window.aboutAPI.close();
      }
    }
  });
});
