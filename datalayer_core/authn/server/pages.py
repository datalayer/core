# Copyright (c) 2023-2025 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

"""Authentication pages for Datalayer Core."""

from __future__ import annotations

LANDING_PAGE = """<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8"/>
    <title>🪐 ⚪ Datalayer Login</title>
    <script id="datalayer-config-data" type="application/json">
      __DATALAYER_CONFIG_JSON__
    </script>
    <link rel="shortcut icon" href="data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAC7SURBVFiF7ZU9CgIxEIXfTHbPopfYc+pJ9AALtmJnZSOIoJWFoCTzLHazxh/Ebpt5EPIxM8XXTCKTxYyMCYwJFhOYCo4JFiMuu317PZwaqEBUIar4YMmskL73DytGjgu4gAt4PDJdzkkzMBloBhqBgcu69XW+1I+rNSQESNDuaMEhdP/Fj/7oW+ACLuACHk/3F5BAfuMLBjm8/ZnxNvNtHmY4b7Ztut0bqStoVSHfWj9Z6mr8LXABF3CBB3nvkDfEVN6PAAAAAElFTkSuQmCC" type="image/x-icon" />
    <link rel="stylesheet" href="/core.css" />
    <script>
      globalThis.process = globalThis.process || { env: { NODE_ENV: 'production' } };
    </script>
    <script defer src="/cli.datalayer-core.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>"""


AUTH_SUCCESS_PAGE = """<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Datalayer CLI Login</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #f6f8fa;
        color: #1f2328;
      }
      .card {
        width: min(560px, calc(100vw - 32px));
        border: 1px solid #d0d7de;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
        padding: 24px;
      }
      h2 {
        margin: 0 0 8px;
        font-size: 20px;
      }
      p {
        margin: 0;
        color: #57606a;
      }
      .muted {
        margin-top: 12px;
        font-size: 13px;
      }
    </style>
    <script type="module">
      const user = {
        uid: __UID_JSON__,
        handle: __HANDLE_JSON__,
        firstName: __FIRST_NAME_JSON__,
        lastName: __LAST_NAME_JSON__,
        email: __EMAIL_JSON__,
        displayName: __DISPLAY_NAME_JSON__,
      };
      const token = __TOKEN_JSON__;
      const userHandle = __HANDLE_JSON__ || '';
      const navigationTarget = __NAVIGATION_TARGET_JSON__;

      window.localStorage.setItem('__USER_KEY__', JSON.stringify(user));
      window.localStorage.setItem('__TOKEN_KEY__', token);

      const statusNode = document.getElementById('status');
      const detailsNode = document.getElementById('details');
      const whoAmINode = document.getElementById('whoami');

      if (whoAmINode) {
        whoAmINode.textContent = `Authenticated as ${userHandle || 'unknown'}.`;
      }

      const setStatus = (title, details) => {
        if (statusNode) statusNode.textContent = title;
        if (detailsNode) detailsNode.textContent = details;
      };

      const finalize = async () => {
        await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_handle: userHandle,
            token,
          }),
        });
      };

      if (navigationTarget) {
        finalize()
          .then(() => {
            setStatus('Authentication successful', 'Redirecting to your requested page...');
            window.location.replace(navigationTarget);
          })
          .catch((error) => {
            console.error('Failed to finalize CLI authentication.', error);
            setStatus('Authentication succeeded, but CLI finalization failed', 'You can retry login from your terminal.');
          });
      } else {
        setStatus('Authentication successful', 'Redirecting to the CLI confirmation page...');
        window.location.replace('/');
      }
    </script>
  </head>
  <body>
    <main class="card">
      <h2 id="status">Finalizing authentication...</h2>
      <p id="details">Please wait while we complete your CLI sign-in.</p>
      <p class="muted" id="whoami"></p>
    </main>
  </body>
</html>"""


OAUTH_ERROR_PAGE = """<!DOCTYPE html>
<html>
<body>
  <p>Failed to authenticate with {provider}.</p>
  <p>Error: {error}</p>
  <button id="return-btn">Return to Jupyter</button>
  <script type="module">
    const btn = document.getElementById("return-btn")
    btn.addEventListener("click", () => {{
      // Redirect to default page
      window.location.replace('{base_url}');
    }})
  </script>
</body>
</html>"""
