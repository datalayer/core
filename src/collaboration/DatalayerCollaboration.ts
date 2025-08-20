/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

type IFetchSessionId = {
  url: string;
  token?: string;
};

/**
 * Fetch the session ID of a collaborative documents from Datalayer.
 */
export async function requestDatalayerCollaborationSessionId({
  url,
  token,
}: IFetchSessionId): Promise<string> {
  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: token ? 'include' : 'omit',
    mode: 'cors',
    cache: 'no-store',
  });
  if (response.ok) {
    const content = await response.json();
    return content['sessionId'];
  }
  console.error('Failed to fetch session ID.', response);
  throw new Error('Failed to fetch session ID.');
}
