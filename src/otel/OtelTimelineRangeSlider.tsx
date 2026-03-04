/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * OtelTimelineRangeSlider – A modern dual-handle timeline range slider
 * for selecting time windows over OTEL signals.
 *
 * Built with Primer React `Box` / `Text` + native pointer events for
 * smooth drag interaction.  Fully theme-aware — inherits all colors
 * from the active Primer theme via CSS functional tokens.
 *
 * Inspired by react-timeline-range-slider (d3-scale + react-compound-slider)
 * but implemented from scratch with zero external dependencies beyond Primer.
 *
 * @module otel/OtelTimelineRangeSlider
 */

import React, { useCallback, useRef, useState, useMemo } from 'react';
import { Box, Text } from '@primer/react';
import type { OtelTimelineRangeSliderProps } from './types';

// ── Helpers ─────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function defaultFormatTick(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function generateTicks(start: Date, end: Date, count: number): Date[] {
  const ticks: Date[] = [];
  const s = start.getTime();
  const e = end.getTime();
  for (let i = 0; i <= count; i++) {
    ticks.push(new Date(lerp(s, e, i / count)));
  }
  return ticks;
}

// ── Component ───────────────────────────────────────────────────────

export const OtelTimelineRangeSlider: React.FC<
  OtelTimelineRangeSliderProps
> = ({
  timelineStart,
  timelineEnd,
  selectedStart,
  selectedEnd,
  onRangeChange,
  onRangeCommit,
  tickCount = 8,
  formatTick = defaultFormatTick,
  height = 56,
  histogram,
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'start' | 'end' | 'track' | null>(null);
  const dragOrigin = useRef({ pct: 0, startPct: 0, endPct: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Compute percentages
  const tlStart = timelineStart.getTime();
  const tlEnd = timelineEnd.getTime();
  const tlRange = tlEnd - tlStart || 1;

  const startPct = ((selectedStart.getTime() - tlStart) / tlRange) * 100;
  const endPct = ((selectedEnd.getTime() - tlStart) / tlRange) * 100;

  const ticks = useMemo(
    () => generateTicks(timelineStart, timelineEnd, tickCount),
    [timelineStart, timelineEnd, tickCount],
  );

  // Histogram bars
  const histMax = useMemo(() => {
    if (!histogram?.length) return 0;
    return Math.max(...histogram.map(h => h.count));
  }, [histogram]);

  // Convert pointer position to percentage
  const pointerToPct = useCallback((clientX: number): number => {
    if (!railRef.current) return 0;
    const rect = railRef.current.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  }, []);

  const pctToDate = useCallback(
    (pct: number): Date => new Date(tlStart + (pct / 100) * tlRange),
    [tlStart, tlRange],
  );

  // ── Pointer handlers ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, target: 'start' | 'end' | 'track') => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragging.current = target;
      const pct = pointerToPct(e.clientX);
      dragOrigin.current = { pct, startPct, endPct };
      setIsDragging(true);
    },
    [pointerToPct, startPct, endPct],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const pct = pointerToPct(e.clientX);
      const origin = dragOrigin.current;

      let newStart = startPct;
      let newEnd = endPct;

      if (dragging.current === 'start') {
        newStart = clamp(pct, 0, endPct - 1);
      } else if (dragging.current === 'end') {
        newEnd = clamp(pct, startPct + 1, 100);
      } else if (dragging.current === 'track') {
        const delta = pct - origin.pct;
        const span = origin.endPct - origin.startPct;
        let s = origin.startPct + delta;
        let e = origin.endPct + delta;
        if (s < 0) {
          s = 0;
          e = span;
        }
        if (e > 100) {
          e = 100;
          s = 100 - span;
        }
        newStart = s;
        newEnd = e;
      }

      onRangeChange(pctToDate(newStart), pctToDate(newEnd));
    },
    [pointerToPct, startPct, endPct, onRangeChange, pctToDate],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragging.current = null;
      setIsDragging(false);
      onRangeCommit?.(selectedStart, selectedEnd);
    },
    [selectedStart, selectedEnd, onRangeCommit],
  );

  // Rail click to jump
  const handleRailClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      const pct = pointerToPct(e.clientX);
      // Jump the closer handle
      const distToStart = Math.abs(pct - startPct);
      const distToEnd = Math.abs(pct - endPct);
      if (distToStart < distToEnd) {
        const newStart = clamp(pct, 0, endPct - 1);
        onRangeChange(pctToDate(newStart), selectedEnd);
        onRangeCommit?.(pctToDate(newStart), selectedEnd);
      } else {
        const newEnd = clamp(pct, startPct + 1, 100);
        onRangeChange(selectedStart, pctToDate(newEnd));
        onRangeCommit?.(selectedStart, pctToDate(newEnd));
      }
    },
    [
      isDragging,
      pointerToPct,
      startPct,
      endPct,
      onRangeChange,
      onRangeCommit,
      pctToDate,
      selectedStart,
      selectedEnd,
    ],
  );

  const RAIL_HEIGHT = height - 24; // Reserve 24px for tick labels
  const HANDLE_WIDTH = 10;
  const HANDLE_HEIGHT = RAIL_HEIGHT;

  return (
    <Box
      sx={{
        width: '100%',
        height,
        px: 3,
        py: 1,
        userSelect: 'none',
        bg: 'canvas.subtle',
        borderBottom: '1px solid',
        borderColor: 'border.default',
      }}
    >
      {/* Rail area */}
      <Box
        ref={railRef}
        onClick={handleRailClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        sx={{
          position: 'relative',
          width: '100%',
          height: RAIL_HEIGHT,
          cursor: 'pointer',
        }}
      >
        {/* Background rail */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bg: 'canvas.inset',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'border.muted',
          }}
        />

        {/* Selected range track */}
        <Box
          onPointerDown={e => handlePointerDown(e, 'track')}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            bg: 'accent.muted',
            borderTop: '2px solid',
            borderBottom: '2px solid',
            borderColor: 'accent.fg',
            cursor: 'grab',
            zIndex: 2,
            transition: isDragging
              ? 'none'
              : 'left 0.05s ease, width 0.05s ease',
            ':active': { cursor: 'grabbing' },
          }}
        />

        {/* Histogram bars – rendered above the selected track so activity is always visible */}
        {histogram &&
          histMax > 0 &&
          histogram.map((h, i) => {
            const pct = ((h.time.getTime() - tlStart) / tlRange) * 100;
            const barWidth = 100 / (histogram.length || 1);
            const barH = (h.count / histMax) * 100;
            return (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: `${pct}%`,
                  width: `${barWidth}%`,
                  height: `${barH}%`,
                  bg: 'accent.fg',
                  opacity: 0.35,
                  borderRadius: '1px 1px 0 0',
                  pointerEvents: 'none',
                  zIndex: 4,
                }}
              />
            );
          })}

        {/* Start handle */}
        <Box
          onPointerDown={e => handlePointerDown(e, 'start')}
          sx={{
            position: 'absolute',
            top: 0,
            left: `${startPct}%`,
            width: HANDLE_WIDTH,
            height: HANDLE_HEIGHT,
            ml: `-${HANDLE_WIDTH / 2}px`,
            bg: 'accent.fg',
            borderRadius: 1,
            cursor: 'ew-resize',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: isDragging ? 'none' : 'left 0.05s ease',
            boxShadow: 'shadow.medium',
            ':hover': { bg: 'accent.emphasis' },
          }}
        >
          <Box
            sx={{
              width: '2px',
              height: '40%',
              bg: 'fg.onEmphasis',
              borderRadius: 1,
            }}
          />
        </Box>

        {/* End handle */}
        <Box
          onPointerDown={e => handlePointerDown(e, 'end')}
          sx={{
            position: 'absolute',
            top: 0,
            left: `${endPct}%`,
            width: HANDLE_WIDTH,
            height: HANDLE_HEIGHT,
            ml: `-${HANDLE_WIDTH / 2}px`,
            bg: 'accent.fg',
            borderRadius: 1,
            cursor: 'ew-resize',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: isDragging ? 'none' : 'left 0.05s ease',
            boxShadow: 'shadow.medium',
            ':hover': { bg: 'accent.emphasis' },
          }}
        >
          <Box
            sx={{
              width: '2px',
              height: '40%',
              bg: 'fg.onEmphasis',
              borderRadius: 1,
            }}
          />
        </Box>

        {/* Tick lines */}
        {ticks.map((t, i) => {
          const pct = ((t.getTime() - tlStart) / tlRange) * 100;
          return (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                top: 0,
                left: `${pct}%`,
                width: '1px',
                height: RAIL_HEIGHT,
                bg: 'border.muted',
                pointerEvents: 'none',
                opacity: 0.5,
                zIndex: 1,
              }}
            />
          );
        })}
      </Box>

      {/* Tick labels row */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 20,
          mt: '2px',
        }}
      >
        {ticks.map((t, i) => {
          const pct = ((t.getTime() - tlStart) / tlRange) * 100;
          return (
            <Text
              key={i}
              sx={{
                position: 'absolute',
                left: `${pct}%`,
                transform: 'translateX(-50%)',
                fontSize: '10px',
                color: 'fg.subtle',
                whiteSpace: 'nowrap',
                fontFamily: 'mono',
                lineHeight: '16px',
                pointerEvents: 'none',
              }}
            >
              {formatTick(t)}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
};
