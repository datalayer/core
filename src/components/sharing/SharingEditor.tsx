/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * SharingEditor — inline editor for the sharing payload shape used by
 * `ShareAccessComponent` ACL endpoints.
 *
 * Unlike `ShareAccessComponent` (which is bound to a server-side resource
 * via `requestUrl`), this component edits a free-form
 * `{ access: { view/update/execute: { userUids, teamUids, organizationUids } } }`
 * blob in memory. It is intended for "create" flows where the resource does
 * not yet exist and the sharing payload must be POSTed alongside the rest of
 * the configuration.
 *
 * This is a scaffold: it currently exposes a structured JSON editor with
 * validation and the canonical default shape. Future iterations can replace
 * the textarea with the same principal-picker UI used by
 * `ShareAccessComponent`.
 */

import { useEffect, useMemo, useState } from 'react';
import { Box } from '@datalayer/primer-addons';
import { FormControl, Text, Textarea } from '@primer/react';

export type SharingAccessLevel = 'view' | 'update' | 'execute';

export type SharingLevelPayload = {
  userUids?: string[];
  teamUids?: string[];
  organizationUids?: string[];
};

export type SharingPayload = {
  access?: Partial<Record<SharingAccessLevel, SharingLevelPayload>>;
};

export const EMPTY_SHARING_PAYLOAD: SharingPayload = {
  access: {
    view: { userUids: [], teamUids: [], organizationUids: [] },
    update: { userUids: [], teamUids: [], organizationUids: [] },
    execute: { userUids: [], teamUids: [], organizationUids: [] },
  },
};

export type SharingEditorProps = {
  value: SharingPayload;
  onChange: (next: SharingPayload) => void;
  label?: string;
  caption?: string;
  rows?: number;
  disabled?: boolean;
};

const stringify = (value: SharingPayload): string => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
};

export function SharingEditor({
  value,
  onChange,
  label = 'Sharing',
  caption = 'Edit the sharing payload. Each access level (view/update/execute) can grant access to user, team, and organization UIDs.',
  rows = 10,
  disabled = false,
}: SharingEditorProps): JSX.Element {
  const initial = useMemo(() => stringify(value), [value]);
  const [raw, setRaw] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRaw(stringify(value));
  }, [value]);

  return (
    <FormControl disabled={disabled}>
      <FormControl.Label>{label}</FormControl.Label>
      <Textarea
        rows={rows}
        value={raw}
        onChange={event => {
          const next = event.target.value;
          setRaw(next);
          if (!next.trim()) {
            setError(null);
            onChange({});
            return;
          }
          try {
            const parsed = JSON.parse(next) as SharingPayload;
            setError(null);
            onChange(parsed);
          } catch (reason: any) {
            setError(reason?.message || 'Invalid JSON');
          }
        }}
        sx={{ width: '100%', fontFamily: 'mono' }}
      />
      <FormControl.Caption>{caption}</FormControl.Caption>
      {error && (
        <Box sx={{ mt: 1 }}>
          <Text sx={{ color: 'danger.fg', fontSize: 1 }}>{error}</Text>
        </Box>
      )}
    </FormControl>
  );
}

export default SharingEditor;
