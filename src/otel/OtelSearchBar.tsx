/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelSearchBar – Filter toolbar with signal-type tabs, service selector,
 * query input, and refresh action.
 *
 * @module otel/OtelSearchBar
 */

import React from 'react';
import type { OtelSearchBarProps, SignalType } from './types';

const SIGNALS: { value: SignalType; label: string; icon: string }[] = [
  { value: 'traces', label: 'Traces', icon: '⎇' },
  { value: 'logs', label: 'Logs', icon: '☰' },
  { value: 'metrics', label: 'Metrics', icon: '📊' },
];

export const OtelSearchBar: React.FC<OtelSearchBarProps> = ({
  signal,
  onSignalChange,
  services,
  selectedService,
  onServiceChange,
  query,
  onQueryChange,
  onRefresh,
  loading,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: '#f6f8fa',
        borderBottom: '1px solid #d0d7de',
        flexWrap: 'wrap',
      }}
    >
      {/* Signal type tabs */}
      <div
        style={{
          display: 'inline-flex',
          borderRadius: 6,
          border: '1px solid #d0d7de',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {SIGNALS.map(s => {
          const active = s.value === signal;
          return (
            <button
              key={s.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? '#ffffff' : '#1f2328',
                background: active ? '#0969da' : '#ffffff',
                border: 'none',
                borderRight: '1px solid #d0d7de',
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms',
              }}
              onClick={() => onSignalChange(s.value)}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Service selector */}
      <select
        value={selectedService}
        onChange={e => onServiceChange(e.target.value)}
        style={{
          padding: '4px 8px',
          fontSize: 12,
          borderRadius: 6,
          border: '1px solid #d0d7de',
          background: '#ffffff',
          color: '#1f2328',
          minWidth: 120,
          cursor: 'pointer',
        }}
      >
        <option value="">All services</option>
        {services.map(svc => (
          <option key={svc} value={svc}>
            {svc}
          </option>
        ))}
      </select>

      {/* Search / query input */}
      <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 12,
            color: '#656d76',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Search spans, logs, metrics…"
          style={{
            width: '100%',
            padding: '5px 8px 5px 28px',
            fontSize: 12,
            borderRadius: 6,
            border: '1px solid #d0d7de',
            background: '#ffffff',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = '#0969da')}
          onBlur={e => (e.target.style.borderColor = '#d0d7de')}
        />
      </div>

      {/* Refresh button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #d0d7de',
            background: loading ? '#f6f8fa' : '#ffffff',
            color: loading ? '#8b949e' : '#1f2328',
            cursor: loading ? 'wait' : 'pointer',
            transition: 'background 120ms',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              animation: loading ? 'otel-spin 1s linear infinite' : 'none',
            }}
          >
            ↻
          </span>
          Refresh
        </button>
      )}

      {/* Keyframe injection for spinner */}
      <style>{`
        @keyframes otel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
