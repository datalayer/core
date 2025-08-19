/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2Rldi5kYXRhbGF5ZXIuaW8iLCJpYXQiOjE3MTc1MDE1MjYsImV4cCI6MTcxNzU4NzkyNiwic3ViIjp7InVpZCI6IjRkODk2ZjI0LWM1MzEtNDljMS1iMjcyLTRlNTM2NjJjZDNkZSIsImhhbmRsZSI6ImVyaWMiLCJlbWFpbCI6ImVyaWNAZGF0YWxheWVyLmlvIiwiZmlyc3RfbmFtZSI6IkVyaWMiLCJsYXN0X25hbWUiOiJDaGFybGVzIiwicm9sZXMiOlsic3lzdGVtX2FkbWluIiwidXNlciJdfSwianRpIjoiZTAxYjIzMTYtYWJlMi00OTkyLWJjMmUtY2UyODIzZGJiOTdmIiwicm9sZXMiOlsic3lzdGVtX2FkbWluIiwidXNlciJdfQ.-cnEfJAUhet_nBLmxzx96zuv3PMEsGWLNCN6HV8PEso';

export const systemAdminLogin = (handle = 'hello') => {
  return {
    success: 'true',
    message: 'User is logged in.',
    token: TOKEN,
    user: {
      avatar_url_s:
        'https://www.gravatar.com/avatar/f78b756a5c0eb7dd186b6622c0afed82',
      creation_ts_dt: '2024-06-01T08:55:45.676Z',
      id: 'b1db2810-9d2b-48fb-93d9-151c577e8b8e',
      join_request_ts_dt: null,
      join_ts_dt: '2024-06-01T08:55:45.139Z',
      last_update_ts_dt: '2024-06-01T08:56:40.595Z',
      new_password_confirmation_ts_dt: null,
      new_password_request_ts_dt: null,
      origin_s: 'cli',
      roles_ss: ['platform_admin', 'user'],
      type_s: 'user',
      email_s: 'hello@datalayer.io',
      first_name_t: 'Hello',
      handle_s: handle,
      last_name_t: 'Datalayer',
    },
  };
};
