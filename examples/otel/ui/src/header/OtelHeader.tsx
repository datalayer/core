/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelHeader – Top-level header bar with branding, signal generator
 * buttons, and a result dialog for the OTEL example application.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, Button, Dialog } from '@primer/react';
import { TelescopeIcon, SignOutIcon } from '@primer/octicons-react';
import {
  parseJwtPayload,
  getDatalayerJwtUser,
  getDatalayerDisplayName,
} from '@datalayer/core/utils/jwt';
import type { DatalayerJwtPayload } from '@datalayer/core/utils/jwt';
import { useAuthStore } from '../stores/authStore';

// ── UserBadge ─────────────────────────────────────────────────────

/** Shows the display name; on hover reveals a JWT details popover. */
const UserBadge: React.FC<{ token: string }> = ({ token }) => {
  const [open, setOpen] = useState(false);
  const user = getDatalayerJwtUser(token);
  const displayName = getDatalayerDisplayName(user, user?.handle ?? '');
  const claims = parseJwtPayload<DatalayerJwtPayload>(token);

  return (
    <Box
      sx={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Text
        sx={{
          fontSize: 1,
          color: 'fg.muted',
          cursor: 'default',
          borderBottom: '1px dashed',
          borderColor: 'border.muted',
          pb: '1px',
          userSelect: 'none',
        }}
      >
        {displayName}
      </Text>

      {open && claims && (
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 100,
            width: '400px',
            bg: 'canvas.overlay',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            boxShadow: 'shadow.large',
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <Box
            sx={{
              px: 3,
              py: 2,
              bg: 'canvas.subtle',
              borderBottom: '1px solid',
              borderColor: 'border.default',
            }}
          >
            <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>JWT Claims</Text>
          </Box>

          {/* User summary */}
          {claims.user && (
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'border.muted' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 1, fontSize: 0 }}>
                {claims.user.email && (
                  <>
                    <Text sx={{ color: 'fg.muted' }}>Email</Text>
                    <Text sx={{ fontFamily: 'mono' }}>{claims.user.email}</Text>
                  </>
                )}
                <Text sx={{ color: 'fg.muted' }}>Handle</Text>
                <Text sx={{ fontFamily: 'mono' }}>{claims.user.handle}</Text>
                <Text sx={{ color: 'fg.muted' }}>UID</Text>
                <Text sx={{ fontFamily: 'mono', wordBreak: 'break-all' }}>{claims.user.uid}</Text>
                <Text sx={{ color: 'fg.muted' }}>Issued</Text>
                <Text sx={{ fontFamily: 'mono' }}>{new Date(claims.iat * 1000).toISOString()}</Text>
                <Text sx={{ color: 'fg.muted' }}>Expires</Text>
                <Text sx={{ fontFamily: 'mono' }}>{new Date(claims.exp * 1000).toISOString()}</Text>
              </Box>
            </Box>
          )}

          {/* Roles */}
          {(claims.user?.roles ?? claims.roles ?? []).length > 0 && (
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'border.muted' }}>
              <Text sx={{ fontSize: 0, color: 'fg.muted', display: 'block', mb: 1 }}>Roles</Text>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(claims.user?.roles ?? claims.roles ?? []).map(r => (
                  <Box
                    key={r}
                    sx={{
                      fontSize: 0,
                      fontFamily: 'mono',
                      px: 1,
                      py: '1px',
                      bg: 'accent.subtle',
                      color: 'accent.fg',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'accent.muted',
                    }}
                  >
                    {r}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Raw JSON */}
          <Box
            as="pre"
            sx={{
              m: 0,
              px: 3,
              py: 2,
              fontFamily: 'mono',
              fontSize: 0,
              color: 'fg.default',
              bg: 'canvas.inset',
              overflow: 'auto',
              maxHeight: '220px',
              whiteSpace: 'pre',
            }}
          >
            {JSON.stringify(claims, null, 2)}
          </Box>
        </Box>
      )}
    </Box>
  );
};

// ── OtelHeader ────────────────────────────────────────────────────

export interface OtelHeaderProps {
  /** Base URL for the generate API. Defaults to ''. */
  baseUrl?: string;
  /** JWT bearer token for authenticated requests. */
  token?: string;
  /** Optional extra controls rendered on the right side of the header. */
  trailing?: React.ReactNode;
  /**
   * Called before a generate request is fired so the dashboard can
   * navigate to the relevant signal view (e.g. "logs", "metrics").
   */
  onNavigate?: (signal: 'traces' | 'logs' | 'metrics') => void;
}

export const OtelHeader: React.FC<OtelHeaderProps> = ({
  baseUrl = '',
  token,
  trailing,
  onNavigate,
}) => {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogRequest, setDialogRequest] = useState('');
  const [dialogBody, setDialogBody] = useState('');
  const [dialogVariant, setDialogVariant] = useState<'success' | 'error'>(
    'success',
  );
  const [generating, setGenerating] = useState(false);
  const returnFocusRef = useRef<HTMLButtonElement>(null);

  const generate = useCallback(
    async (kind: 'traces' | 'ai-traces' | 'logs' | 'metrics', count: number) => {
      // Navigate to the corresponding view first.
      if (onNavigate) {
        const signalMap: Record<string, 'traces' | 'logs' | 'metrics'> = {
          traces: 'traces',
          'ai-traces': 'traces',
          logs: 'logs',
          metrics: 'metrics',
        };
        onNavigate(signalMap[kind]);
      }
      setGenerating(true);
      const url = `${baseUrl}/api/generate/${kind}?count=${count}`;
      setDialogRequest(`POST ${url}`);
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const resp = await fetch(url, { method: 'POST', headers });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setDialogTitle(`Generated ${kind}`);
        setDialogBody(JSON.stringify(data, null, 2));
        setDialogVariant('success');
      } catch (err: unknown) {
        setDialogTitle(`Error generating ${kind}`);
        setDialogBody(err instanceof Error ? err.message : String(err));
        setDialogVariant('error');
      } finally {
        setGenerating(false);
        setDialogOpen(true);
      }
    },
    [baseUrl, token, onNavigate],
  );

  return (
    <>
      <Box
        as="header"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          px: 3,
          py: 2,
          bg: 'canvas.inset',
          borderBottom: '1px solid',
          borderColor: 'border.default',
          flexShrink: 0,
          // Allow overflow visible so the JWT popover can extend below the header.
          overflow: 'visible',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TelescopeIcon size={20} />
          <Text sx={{ fontWeight: 'bold', fontSize: 2 }}>Datalayer OTEL</Text>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Button
          ref={returnFocusRef}
          size="small"
          variant="primary"
          disabled={generating}
          onClick={() => generate('traces', 3)}
        >
          + Traces
        </Button>
        <Button
          size="small"
          variant="primary"
          disabled={generating}
          onClick={() => generate('ai-traces', 3)}
        >
          + AI Traces
        </Button>
        <Button
          size="small"
          variant="primary"
          disabled={generating}
          onClick={() => generate('logs', 10)}
        >
          + Logs
        </Button>
        <Button
          size="small"
          variant="primary"
          disabled={generating}
          onClick={() => generate('metrics', 5)}
        >
          + Metrics
        </Button>

        {trailing}

        {token && <UserBadge token={token} />}

        <Button
          size="small"
          variant="invisible"
          onClick={clearAuth}
          sx={{ color: 'fg.muted' }}
          leadingVisual={SignOutIcon}
        >
          Logout
        </Button>
      </Box>

      {dialogOpen && (
        <Dialog
          title={dialogTitle}
          onClose={() => setDialogOpen(false)}
          footerButtons={[
            {
              content: 'Close',
              onClick: () => setDialogOpen(false),
              buttonType: 'default',
            },
          ]}
        >
          {/* Request */}
          <Box sx={{ mb: 2 }}>
            <Text sx={{ fontWeight: 'bold', fontSize: 1, color: 'fg.muted' }}>
              Request
            </Text>
            <Box
              as="pre"
              sx={{
                fontFamily: 'mono',
                fontSize: 1,
                p: 2,
                mt: 1,
                bg: 'canvas.inset',
                borderRadius: 2,
                overflow: 'auto',
                color: 'fg.default',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                border: '1px solid',
                borderColor: 'border.default',
              }}
            >
              {dialogRequest}
            </Box>
          </Box>
          {/* Response */}
          <Box>
            <Text sx={{ fontWeight: 'bold', fontSize: 1, color: 'fg.muted' }}>
              Response
            </Text>
            <Box
              as="pre"
              sx={{
                fontFamily: 'mono',
                fontSize: 1,
                p: 2,
                mt: 1,
                bg: 'canvas.subtle',
                borderRadius: 2,
                overflow: 'auto',
                maxHeight: 300,
                color:
                  dialogVariant === 'error' ? 'danger.fg' : 'fg.default',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {dialogBody}
            </Box>
          </Box>
        </Dialog>
      )}
    </>
  );
};
