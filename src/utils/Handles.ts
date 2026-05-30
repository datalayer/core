/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

const EXT_URN_PREFIX = 'urn:dla:iam:ext::';

export function isExternalUrnHandle(handle?: string): boolean {
  const normalized = (handle || '').trim().toLowerCase();
  return normalized.startsWith(EXT_URN_PREFIX);
}

export function formatFriendlyHandle(handle?: string): string {
  const normalizedHandle = (handle || '').trim();
  if (!normalizedHandle) {
    return 'unknown';
  }

  if (!isExternalUrnHandle(normalizedHandle)) {
    return normalizedHandle;
  }

  const externalId = normalizedHandle.slice(EXT_URN_PREFIX.length);
  const [providerRaw, ...restParts] = externalId.split(':');
  const provider = (providerRaw || '').toLowerCase();
  const providerLabel =
    provider === 'github'
      ? 'GitHub'
      : provider === 'google'
        ? 'Google'
        : providerRaw || 'External';
  const identifier = restParts.join(':').trim();

  if (!identifier) {
    return providerLabel;
  }

  const shortIdentifier =
    identifier.length > 18 ? `${identifier.slice(0, 15)}...` : identifier;

  return `${providerLabel} ${shortIdentifier}`;
}

export function normalizeHandleFromName(value?: string): string {
  const source = String(value || '').trim();
  if (!source) {
    return '';
  }

  const transliterated = source
    .replace(/ß/g, 'ss')
    .replace(/æ/gi, 'ae')
    .replace(/œ/gi, 'oe')
    .replace(/ø/gi, 'o')
    .replace(/đ/gi, 'd')
    .replace(/þ/gi, 'th')
    .replace(/ł/gi, 'l')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  return transliterated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
