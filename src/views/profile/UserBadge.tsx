/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * UserBadge – Shows the authenticated user's display name.
 *
 * On hover, reveals a JWT details popover with email, handle, UID,
 * issued/expiry timestamps, roles, and the raw decoded claims.
 *
 * The trigger text and the popover share a single container so the
 * popover stays open while the mouse travels from the label into it.
 *
 * @module views/profile
 */

import React, { useState, useRef, useCallback } from 'react';
import { Box, Text } from '@primer/react';
import {
  parseJwtPayload,
  getDatalayerJwtUser,
  getDatalayerDisplayName,
} from '../../utils/Jwt';
import type { DatalayerJwtPayload } from '../../utils/Jwt';

// ── Props ─────────────────────────────────────────────────────────

export interface UserBadgeProps {
  /** Raw JWT bearer token. */
  token: string;
  /** Display variant for the claims overlay. */
  variant?: 'full' | 'small';
  /**
   * When the popover is rendered in the ``small`` variant, show a ``+``
   * affordance in the top-right corner of the header that lets the user
   * expand the overlay to the ``full`` variant (raw JSON claims).
   *
   * Defaults to ``true``.  Ignored when ``variant`` is already ``full``.
   */
  showExpandToggle?: boolean;
  /**
   * Threshold (in milliseconds) below which the expiration timestamp is
   * rendered in ``attention.fg`` (yellow) to warn that the token is about
   * to expire.  Tokens already past ``exp`` render in ``danger.fg`` (red);
   * tokens further out than this threshold render in ``success.fg``
   * (green).  Defaults to ``3_600_000`` (1 hour).
   */
  expirationWarningMs?: number;
}

// ── Component ─────────────────────────────────────────────────────

export const UserBadge: React.FC<UserBadgeProps> = ({
  token,
  variant = 'full',
  showExpandToggle = true,
  expirationWarningMs = 60 * 60 * 1000,
}) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    // Small delay so the mouse can travel from the label into the popover
    // without it closing.
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  const user = getDatalayerJwtUser(token);
  const displayName = getDatalayerDisplayName(user, user?.handle ?? '');
  const claims = parseJwtPayload<DatalayerJwtPayload>(token);

  return (
    <Box
      sx={{ position: 'relative' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Trigger */}
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

      {/* Popover */}
      {open && claims && (
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>JWT Claims</Text>
            {variant === 'small' && showExpandToggle && (
              <Box
                as="button"
                type="button"
                onClick={() => setExpanded(v => !v)}
                aria-label={
                  expanded ? 'Hide full JWT claims' : 'Show full JWT claims'
                }
                aria-expanded={expanded}
                title={
                  expanded ? 'Hide full JWT claims' : 'Show full JWT claims'
                }
                sx={{
                  appearance: 'none',
                  border: '1px solid',
                  borderColor: 'border.default',
                  borderRadius: 1,
                  bg: 'canvas.default',
                  color: 'fg.default',
                  fontSize: 1,
                  lineHeight: 1,
                  width: '20px',
                  height: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  p: 0,
                  '&:hover': {
                    bg: 'canvas.subtle',
                  },
                }}
              >
                {expanded ? '−' : '+'}
              </Box>
            )}
          </Box>

          {/* User summary */}
          {claims.user && (
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'border.muted',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr',
                  gap: 1,
                  fontSize: 0,
                }}
              >
                {claims.user.email && (
                  <>
                    <Text sx={{ color: 'fg.muted' }}>Email</Text>
                    <Text sx={{ fontFamily: 'mono' }}>{claims.user.email}</Text>
                  </>
                )}
                <Text sx={{ color: 'fg.muted' }}>Handle</Text>
                <Text sx={{ fontFamily: 'mono' }}>{claims.user.handle}</Text>
                <Text sx={{ color: 'fg.muted' }}>UID</Text>
                <Text sx={{ fontFamily: 'mono', wordBreak: 'break-all' }}>
                  {claims.user.uid}
                </Text>
                <Text sx={{ color: 'fg.muted' }}>Issued</Text>
                <Text sx={{ fontFamily: 'mono' }}>
                  {new Date(claims.iat * 1000).toISOString()}
                </Text>
                <Text sx={{ color: 'fg.muted' }}>Expires</Text>
                <Text
                  sx={{
                    fontFamily: 'mono',
                    color: (() => {
                      const msUntilExpiry = claims.exp * 1000 - Date.now();
                      if (msUntilExpiry <= 0) return 'danger.fg';
                      if (msUntilExpiry <= expirationWarningMs)
                        return 'attention.fg';
                      return 'success.fg';
                    })(),
                  }}
                >
                  {new Date(claims.exp * 1000).toISOString()}
                </Text>
              </Box>
            </Box>
          )}

          {/* Roles */}
          {(claims.user?.roles ?? claims.roles ?? []).length > 0 && (
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'border.muted',
              }}
            >
              <Text
                sx={{ fontSize: 0, color: 'fg.muted', display: 'block', mb: 1 }}
              >
                Roles
              </Text>
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
          {(variant === 'full' || expanded) && (
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
          )}
        </Box>
      )}
    </Box>
  );
};

export default UserBadge;
