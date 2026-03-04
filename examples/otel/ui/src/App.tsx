/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Datalayer OTEL Example – Main application.
 *
 * The top bar lets the user generate signals (traces / logs / metrics)
 * via the FastAPI backend.  Below it, the OtelLive component renders
 * the full observability dashboard, reading data from the same backend
 * through the proxy.
 */

import React, { useState, useCallback } from 'react';
import { OtelLive } from '@datalayer/core/otel';

// Use the Vite proxy – all /api requests → FastAPI on port 8600
const BASE_URL = '';

export const App: React.FC = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(
    async (kind: 'traces' | 'logs' | 'metrics', count: number) => {
      setGenerating(true);
      setStatus(`Generating ${count} ${kind}…`);
      try {
        const resp = await fetch(
          `/api/generate/${kind}?count=${count}`,
          { method: 'POST' },
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setStatus(`✓ ${JSON.stringify(data)}`);
      } catch (err: any) {
        setStatus(`✗ ${err.message}`);
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      {/* ── Header / generator bar ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: '#24292f',
          color: '#ffffff',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          🔭 Datalayer OTEL
        </span>

        <div style={{ flex: 1 }} />

        <GenerateButton
          label="+ Traces"
          disabled={generating}
          onClick={() => generate('traces', 3)}
        />
        <GenerateButton
          label="+ Logs"
          disabled={generating}
          onClick={() => generate('logs', 10)}
        />
        <GenerateButton
          label="+ Metrics"
          disabled={generating}
          onClick={() => generate('metrics', 5)}
        />

        {status && (
          <span
            style={{
              fontSize: 11,
              color: status.startsWith('✗') ? '#ff7b72' : '#7ee787',
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {status}
          </span>
        )}
      </header>

      {/* ── Dashboard ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <OtelLive
          baseUrl={BASE_URL}
          autoRefreshMs={5000}
          defaultSignal="traces"
          limit={200}
        />
      </div>
    </div>
  );
};

// ── Small generate button ───────────────────────────────────────────

const GenerateButton: React.FC<{
  label: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '4px 12px',
      fontSize: 12,
      fontWeight: 600,
      borderRadius: 6,
      border: '1px solid #30363d',
      background: disabled ? '#30363d' : '#238636',
      color: '#ffffff',
      cursor: disabled ? 'wait' : 'pointer',
      transition: 'background 120ms',
    }}
    onMouseEnter={(e) => {
      if (!disabled)
        (e.target as HTMLElement).style.background = '#2ea043';
    }}
    onMouseLeave={(e) => {
      if (!disabled)
        (e.target as HTMLElement).style.background = '#238636';
    }}
  >
    {label}
  </button>
);
