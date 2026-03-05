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
import { useAuthStore } from '../stores/authStore';

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
  const handle = useAuthStore((s) => s.handle);
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

        {handle && (
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>{handle}</Text>
        )}
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
