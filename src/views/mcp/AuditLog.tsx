/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Who did what, and was it allowed.
 *
 * The audit log is the trail an auditor reads, so it is drawn as the
 * activity timeline is — newest first, one mark per row, the decision on
 * the mark — rather than as a grid of identifiers. The filters live in the
 * address, which is what makes a row's page shareable, and the page is
 * cursor-paged: an audit query is bounded at the service, and a page number
 * over an append-only collection would be a different set of rows every
 * time it was asked for.
 *
 * Rows are immutable. This view never offers to edit or delete one, and it
 * never shows an argument in clear — arguments are hashed and redacted with
 * the Contents rules before they reach the row.
 *
 * Audit is not telemetry: a row carries the trace id so one call can be
 * followed into the traces, and the traces say so about themselves on the
 * observability page.
 *
 * @module views/mcp/AuditLog
 */

import { useMemo, useRef, useState } from 'react';
import {
  ActionList,
  ActionMenu,
  Button,
  Heading,
  Label,
  Link,
  Flash,
  RelativeTime,
  Select,
  Spinner,
  Text,
  TextInput,
} from '@primer/react';
import { Blankslate, Dialog } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  HistoryIcon,
  ShieldLockIcon,
  XCircleIcon,
} from '@primer/octicons-react';
import { McpErrorBlankslate } from '../../components/mcp';
import {
  useAuditEvents,
  useAuditExport,
  useMcpForwarding,
} from '../../hooks/useMcp';
import { useNavigate, useToast } from '../../hooks';
import type { McpAuditFilters } from '../../api/mcp';
import type {
  McpAuditEvent,
  McpAuditExportFormat,
} from '../../models/McpAuditEvent';
import { durationLabel } from './format';
import { type McpErrorStateFn, type McpRoutes } from './types';

export interface AuditLogProps {
  /** The application's words for a failed request. */
  errorState: McpErrorStateFn;
  /** Where this application puts the surfaces this view links to. */
  routes: McpRoutes;
  /** The filters, exactly as the address holds them. */
  filters: McpAuditFilters;
  /** Asked to write a new set of filters into the address. */
  onFiltersChange: (filters: McpAuditFilters) => void;
  /** How long rows are kept on this account's plan, when it is known. */
  retentionDays?: number;
  /** Drawn without its heading, when the page around it carries one. */
  showTitle?: boolean;
  /** What this log is of: "your agents", "acme". */
  subject?: string;
}

/** How many rows a page holds. */
const PAGE_SIZE = 50;

const decisionLook = (event: McpAuditEvent) => {
  if (event.decision === 'refused') {
    return { fg: 'danger.fg', bg: 'danger.subtle', Icon: ShieldLockIcon };
  }
  if (event.outcome && event.outcome !== 'ok') {
    return { fg: 'attention.fg', bg: 'attention.subtle', Icon: XCircleIcon };
  }
  return { fg: 'success.fg', bg: 'success.subtle', Icon: CheckCircleIcon };
};

/** Save a document the browser never navigated to. */
const download = (content: string, filename: string, mime: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const AuditLog = ({
  errorState,
  routes,
  filters,
  onFiltersChange,
  retentionDays,
  showTitle = true,
  subject = 'your agents',
}: AuditLogProps): JSX.Element => {
  const navigate = useNavigate();
  const { enqueueToast } = useToast();
  const page = useAuditEvents({ limit: PAGE_SIZE, ...filters });
  const exporting = useAuditExport();
  // Only an organization forwards; a personal audit has nowhere to go.
  const forwarding = useMcpForwarding(filters.org ?? '', {
    enabled: Boolean(filters.org),
  });
  const [open, setOpen] = useState<McpAuditEvent | null>(null);
  // Primer 37 types Dialog's focus refs with React 18's non-nullable
  // `RefObject<HTMLElement>`. React 19's `useRef(null)` is nullable, and this
  // ref is only handed to Dialog, so narrow it once here.
  const returnFocusRef = useRef<HTMLElement>(
    null,
  ) as React.RefObject<HTMLElement>;
  /** The cursors already walked, so "Newer" is a step back rather than a guess. */
  const [walked, setWalked] = useState<string[]>([]);

  const rows = page.data?.items ?? [];
  const nextCursor = page.data?.nextCursor ?? null;

  const set = (patch: Partial<McpAuditFilters>) => {
    // Any change to what is selected starts the walk again: a cursor is a
    // position in one query's answer, and means nothing in another's.
    setWalked([]);
    onFiltersChange({ ...filters, ...patch, cursor: undefined });
  };

  const older = () => {
    if (!nextCursor) {
      return;
    }
    setWalked(current => [...current, filters.cursor ?? '']);
    onFiltersChange({ ...filters, cursor: nextCursor });
  };

  const newer = () => {
    const previous = walked[walked.length - 1];
    setWalked(current => current.slice(0, -1));
    onFiltersChange({ ...filters, cursor: previous || undefined });
  };

  const exportAs = (format: McpAuditExportFormat) => {
    const { cursor: _cursor, limit: _limit, ...selection } = filters;
    exporting.mutate(
      { filters: selection, format },
      {
        onSuccess: content => {
          download(
            content,
            `mcp-audit-${new Date().toISOString().slice(0, 10)}.${format}`,
            format === 'csv' ? 'text/csv' : 'application/x-ndjson',
          );
        },
        onError: reason =>
          enqueueToast(`Could not export: ${reason.message}`, {
            variant: 'error',
          }),
      },
    );
  };

  const retention = useMemo(
    () =>
      retentionDays
        ? `Rows are kept for ${retentionDays} days on this plan, then deleted.`
        : 'Rows are kept for the retention period of this plan, then deleted.',
    [retentionDays],
  );

  if (page.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(page.error, 'Audit')}
        onRetry={() => page.refetch()}
      />
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      {showTitle && (
        <Box>
          <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
            Audit
          </Heading>
          <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
            Every call {subject} made through MCP, what was decided, and why.
          </Text>
        </Box>
      )}

      {/* Whether these rows are also reaching the organization's own system
          of record.
 
          Forwarding never fails the call it describes, so a failure is
          invisible unless something says so — and a silently dropped audit
          record looks exactly like nothing having happened. This is the
          only place it is said. */}
      {forwarding.data?.configured && forwarding.data.state && (
        <Flash variant={forwarding.data.state.healthy ? 'default' : 'danger'}>
          <Text sx={{ fontSize: 1 }}>
            {forwarding.data.state.healthy ? (
              <>
                Forwarded to your own system of record —{' '}
                {forwarding.data.state.delivered} batches
                {forwarding.data.state.lastDeliveredAt && (
                  <>
                    , last{' '}
                    <RelativeTime
                      datetime={forwarding.data.state.lastDeliveredAt}
                    />
                  </>
                )}
                .
              </>
            ) : (
              <>
                <strong>Forwarding is failing.</strong> These rows are kept here
                and are not reaching your own system of record:{' '}
                {forwarding.data.state.lastError}
                {forwarding.data.state.lastErrorAt && (
                  <>
                    {' '}
                    (
                    <RelativeTime
                      datetime={forwarding.data.state.lastErrorAt}
                    />
                    )
                  </>
                )}
                . {forwarding.data.state.failed} batches have failed.
              </>
            )}
          </Text>
        </Flash>
      )}

      {/* What is being looked at. Every one of these is in the address, so a
          filtered log is a link somebody else can open. */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: ['1fr', 'repeat(2, 1fr)', 'repeat(5, 1fr)'],
          alignItems: 'end',
        }}
      >
        <TextInput
          size="small"
          aria-label="Agent"
          placeholder="Agent"
          value={filters.agent ?? ''}
          onChange={event =>
            set({ agent: event.currentTarget.value || undefined })
          }
        />
        <TextInput
          size="small"
          aria-label="Tool"
          placeholder="Tool"
          value={filters.tool ?? ''}
          onChange={event =>
            set({ tool: event.currentTarget.value || undefined })
          }
        />
        <Select
          size="small"
          aria-label="Decision"
          value={filters.decision ?? ''}
          onChange={event =>
            set({
              decision: (event.currentTarget.value ||
                undefined) as McpAuditFilters['decision'],
            })
          }
        >
          <Select.Option value="">Every decision</Select.Option>
          <Select.Option value="allowed">Allowed</Select.Option>
          <Select.Option value="refused">Refused</Select.Option>
        </Select>
        <Select
          size="small"
          aria-label="Outcome"
          value={filters.outcome ?? ''}
          onChange={event =>
            set({
              outcome: (event.currentTarget.value ||
                undefined) as McpAuditFilters['outcome'],
            })
          }
        >
          <Select.Option value="">Every outcome</Select.Option>
          <Select.Option value="ok">Succeeded</Select.Option>
          <Select.Option value="error">Failed</Select.Option>
          <Select.Option value="is_error">Tool error</Select.Option>
        </Select>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <ActionMenu>
            <ActionMenu.Button
              size="small"
              leadingVisual={DownloadIcon}
              disabled={exporting.isPending}
            >
              Export
            </ActionMenu.Button>
            <ActionMenu.Overlay align="end">
              <ActionList>
                <ActionList.Item onSelect={() => exportAs('jsonl')}>
                  JSONL
                  <ActionList.Description variant="block">
                    One row per line, as a SIEM reads it.
                  </ActionList.Description>
                </ActionList.Item>
                <ActionList.Item onSelect={() => exportAs('csv')}>
                  CSV
                  <ActionList.Description variant="block">
                    The same rows for a spreadsheet.
                  </ActionList.Description>
                </ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </Box>
      </Box>

      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        Audit rows are written once and never changed or deleted by anyone, here
        or elsewhere. Arguments are redacted before they are written.{' '}
        {retention}
      </Text>

      {page.isPending && !page.data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <Spinner />
        </Box>
      ) : rows.length === 0 ? (
        <Blankslate border spacious>
          <Blankslate.Visual>
            <HistoryIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>Nothing to audit yet</Blankslate.Heading>
          <Blankslate.Description>
            <Text sx={{ textAlign: 'center' }}>
              Every call an agent makes is written down here with its decision
              and its outcome. Connect a client and ask it to list your
              notebooks.
            </Text>
          </Blankslate.Description>
          <Button size="small" onClick={() => navigate(routes.access)}>
            Connect an agent
          </Button>
        </Blankslate>
      ) : (
        /* The rail of the activity view: each mark on a tinted disc, the discs
           linked by a line, so the rows carry no border of their own. */
        <Box sx={{ display: 'grid' }}>
          {rows.map((event, index) => {
            const look = decisionLook(event);
            const isLast = index === rows.length - 1;
            return (
              <Box key={event.uid} sx={{ display: 'flex', gap: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: look.fg,
                      bg: look.bg,
                      flexShrink: 0,
                    }}
                  >
                    <look.Icon size={13} />
                  </Box>
                  {!isLast && (
                    <Box
                      sx={{ width: '2px', flex: 1, bg: 'border.muted', my: 1 }}
                    />
                  )}
                </Box>
                <Box
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    pb: isLast ? 0 : 3,
                    pt: '3px',
                  }}
                >
                  <Link
                    as="button"
                    sx={{
                      fontSize: 1,
                      display: 'block',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onClick={() => setOpen(event)}
                  >
                    {event.tool || event.method}
                  </Link>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      alignItems: 'center',
                      mt: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Label
                      size="small"
                      variant={
                        event.decision === 'refused' ? 'danger' : 'success'
                      }
                    >
                      {event.decision}
                    </Label>
                    {event.clientId && (
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                        {event.clientId}
                      </Text>
                    )}
                    {event.itemUid && (
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                        on {event.itemUid}
                      </Text>
                    )}
                    {event.durationMs !== null &&
                      event.durationMs !== undefined && (
                        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                          {durationLabel(event.durationMs)}
                        </Text>
                      )}
                    {event.refusalReason && (
                      <Text sx={{ fontSize: 0, color: 'danger.fg' }}>
                        {event.refusalReason}
                      </Text>
                    )}
                  </Box>
                </Box>
                <Text sx={{ fontSize: 0, color: 'fg.muted', flexShrink: 0 }}>
                  <RelativeTime datetime={event.at} />
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* A cursor walk, not a page number: the collection only grows. */}
      {(walked.length > 0 || nextCursor) && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            size="small"
            leadingVisual={ChevronLeftIcon}
            disabled={walked.length === 0}
            onClick={newer}
          >
            Newer
          </Button>
          <Button
            size="small"
            trailingVisual={ChevronRightIcon}
            disabled={!nextCursor}
            onClick={older}
          >
            Older
          </Button>
        </Box>
      )}

      {open && (
        <Dialog
          title={open.tool || open.method}
          subtitle={`${open.decision} · ${open.outcome ?? 'no outcome recorded'}`}
          onClose={() => setOpen(null)}
          returnFocusRef={returnFocusRef}
          width="large"
        >
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>When</Text>
              <Text sx={{ fontSize: 1 }}>
                <RelativeTime datetime={open.at} /> — {open.at}
              </Text>
            </Box>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Who</Text>
              <Text sx={{ fontSize: 1 }}>
                {open.clientId || 'unknown client'}
                {open.act &&
                  open.act.length > 0 &&
                  ` acting for ${open.act.join(' → ')}`}
              </Text>
            </Box>
            {open.refusalReason && (
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  Why it was refused
                </Text>
                <Text sx={{ fontSize: 1, color: 'danger.fg' }}>
                  {open.refusalReason}
                </Text>
              </Box>
            )}
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                Arguments, redacted before they were written
              </Text>
              <Box
                as="pre"
                sx={{
                  m: 0,
                  p: 2,
                  fontSize: 0,
                  bg: 'canvas.inset',
                  borderRadius: 2,
                  overflowX: 'auto',
                }}
              >
                {JSON.stringify(open.redactedArguments ?? {}, null, 2)}
              </Box>
              {open.argumentsHash && (
                <Text
                  sx={{ fontSize: 0, color: 'fg.subtle', fontFamily: 'mono' }}
                >
                  {open.argumentsHash}
                </Text>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {open.taskId && (
                <Button
                  size="small"
                  onClick={() =>
                    navigate(
                      `${routes.runs}/${encodeURIComponent(open.taskId!)}`,
                    )
                  }
                >
                  The run
                </Button>
              )}
              {open.traceId && (
                <Button
                  size="small"
                  onClick={() =>
                    navigate(
                      `${routes.observability}?trace=${encodeURIComponent(open.traceId!)}`,
                    )
                  }
                >
                  The trace
                </Button>
              )}
            </Box>
          </Box>
        </Dialog>
      )}
    </Box>
  );
};

export default AuditLog;
