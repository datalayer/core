# Copyright (c) Datalayer Development Team.
# Distributed under the terms of the Modified BSD License.

from __future__ import annotations


LANDING_PAGE = """<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8"/>
    <title>🪐 ⚪ Datalayer Login</title>
    <script id="datalayer-config-data" type="application/json">
      {config}
    </script>
    <link rel="shortcut icon" href="data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAC7SURBVFiF7ZU9CgIxEIXfTHbPopfYc+pJ9AALtmJnZSOIoJWFoCTzLHazxh/Ebpt5EPIxM8XXTCKTxYyMCYwJFhOYCo4JFiMuu317PZwaqEBUIar4YMmskL73DytGjgu4gAt4PDJdzkkzMBloBhqBgcu69XW+1I+rNSQESNDuaMEhdP/Fj/7oW+ACLuACHk/3F5BAfuMLBjm8/ZnxNvNtHmY4b7Ztut0bqStoVSHfWj9Z6mr8LXABF3CBB3nvkDfEVN6PAAAAAElFTkSuQmCC" type="image/x-icon" />
    <script defer src="/main.datalayer-core.js"></script>
  </head>
  <body>
  </body>
</html>"""


AUTH_SUCCESS_PAGE = """<!DOCTYPE html>
<html>
<body>
  <script type="module">
    // Store the user information
    window.localStorage.setItem(
      '{user_key}',
      JSON.stringify({{
        uid: '{uid}',
        handle: '{handle}',
        firstName: '{first_name}',
        lastName: '{last_name}',
        email: '{email}',
        displayName: '{display_name}'
      }})
    );
    // Store the token
    localStorage.setItem('{token_key}', '{token}');
    // Redirect to default page
    window.location.replace('{base_url}');
  </script>
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
