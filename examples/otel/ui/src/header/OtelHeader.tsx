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

export interface OtelHeaderProps {
  /** Base URL for the generate API. Defaults to ''. */
  baseUrl?: string;
  /** Optional extra controls rendered on the right side of the header. */
  trailing?: React.ReactNode;
}

export const OtelHeader: React.FC<OtelHeaderProps> = ({
  baseUrl = '',
  trailing,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogBody, setDialogBody] = useState('');
  const [dialogVariant, setDialogVariant] = useState<'success' | 'error'>(
    'success',
  );
  const [generating, setGenerating] = useState(false);
  const returnFocusRef = useRef<HTMLButtonElement>(null);

  const generate = useCallback(
    async (kind: 'traces' | 'logs' | 'metrics', count: number) => {
      setGenerating(true);
      try {
        const resp = await fetch(
          `${baseUrl}/api/generate/${kind}?count=${count}`,
          { method: 'POST' },
        );
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
    [baseUrl],
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
        <Text sx={{ fontWeight: 'bold', fontSize: 2 }}>🔭 Datalayer OTEL</Text>

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
      </Box>

      {dialogOpen && (
        <Dialog
          title={dialogTitle}
          onClose={() => setDialogOpen(false)}
          footerButtons={[
            {
              content: 'Close',
              onClick: () => setDialogOpen(false),
            },
          ]}
        >
          <Box
            as="pre"
            sx={{
              fontFamily: 'mono',
              fontSize: 1,
              p: 2,
              bg: 'canvas.subtle',
              borderRadius: 2,
              overflow: 'auto',
              maxHeight: 300,
              color: dialogVariant === 'error' ? 'danger.fg' : 'fg.default',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {dialogBody}
          </Box>
        </Dialog>
      )}
    </>
  );
};
