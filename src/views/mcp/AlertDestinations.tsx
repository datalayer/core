/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Where a fired alert goes, besides the notice in the app.
 *
 * These sit beside the rules because they are half of the same decision: a
 * rule with nowhere to go is a row somebody has to remember to look at, and
 * a destination with no rules is nothing at all.
 *
 * They live on the organization rather than on each rule, and that is worth
 * knowing while editing them: a URL repeated on twenty rules is nineteen
 * places to forget when it rotates, and the rules would disagree about where
 * the organization is reachable.
 *
 * **Slack has its own field.** Not fussiness — the transport is the same and
 * the body is not. Slack renders a generic JSON POST as one grey line of
 * text; given Block Kit it renders a coloured attachment with the reading,
 * the severity and the scope as separate fields. IAM refuses a
 * non-Slack URL here, because anything else sent Block Kit half-works and
 * looks configured.
 *
 * Only what changed is sent. IAM merges these settings, and this form does
 * not show retention or SIEM forwarding — sending them empty would clear
 * decisions made on another page by somebody else.
 *
 * @module views/mcp/AlertDestinations
 */

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Flash,
  FormControl,
  Heading,
  Spinner,
  Text,
  TextInput,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { McpErrorBlankslate } from '../../components/mcp';
import { useAuditSettings, useSetAuditSettings } from '../../hooks/useMcp';
import { useToast } from '../../hooks';
import { AuditSettingInvalid } from '../../api/iam/mcpAuditSettings';
import type { McpErrorStateFn } from './types';

export interface AlertDestinationsProps {
  errorState: McpErrorStateFn;
  orgUid: string;
  readOnly?: boolean;
}

type Draft = {
  alertEmails: string;
  alertWebhookUrl: string;
  alertSlackWebhookUrl: string;
};

const EMPTY: Draft = {
  alertEmails: '',
  alertWebhookUrl: '',
  alertSlackWebhookUrl: '',
};

export const AlertDestinations = ({
  errorState,
  orgUid,
  readOnly = false,
}: AlertDestinationsProps): JSX.Element => {
  const { enqueueToast } = useToast();
  const settings = useAuditSettings(orgUid);
  const save = useSetAuditSettings(orgUid);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [refusal, setRefusal] = useState('');

  const stored = useMemo<Draft>(
    () => ({
      alertEmails: settings.data?.alertEmails ?? '',
      alertWebhookUrl: settings.data?.alertWebhookUrl ?? '',
      alertSlackWebhookUrl: settings.data?.alertSlackWebhookUrl ?? '',
    }),
    [settings.data],
  );

  useEffect(() => setDraft(stored), [stored]);

  const changed = useMemo(
    () =>
      (Object.keys(EMPTY) as (keyof Draft)[]).some(
        key => draft[key] !== stored[key],
      ),
    [draft, stored],
  );

  const set = (key: keyof Draft, value: string) =>
    setDraft(current => ({ ...current, [key]: value }));

  const apply = () => {
    setRefusal('');
    // Only the fields this form owns, and only those that changed. Sending
    // an untouched retention as empty would clear a decision made on
    // another page by somebody else.
    const changes: Partial<Draft> = {};
    for (const key of Object.keys(EMPTY) as (keyof Draft)[]) {
      if (draft[key] !== stored[key]) {
        changes[key] = draft[key].trim();
      }
    }
    save.mutate(
      { settings: changes, expectedVersion: settings.data?.version },
      {
        onSuccess: () => {
          enqueueToast('Saved. The next firing goes there.', {
            variant: 'success',
          });
        },
        onError: error => {
          if (error instanceof AuditSettingInvalid) {
            // IAM's own words. "That is not a Slack incoming webhook" is the
            // whole answer, and a generic failure would send somebody
            // looking for a problem that is already named.
            setRefusal(error.message);
            return;
          }
          enqueueToast(`Could not save: ${error.message}`, {
            variant: 'error',
          });
        },
      },
    );
  };

  if (settings.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(settings.error, 'Alert destinations')}
        onRetry={() => settings.refetch()}
      />
    );
  }

  if (settings.isPending && settings.data === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        maxWidth: '42rem',
        p: 3,
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
      }}
    >
      <Box>
        <Heading as="h3" sx={{ fontSize: 2, mb: 1 }}>
          Where alerts go
        </Heading>
        <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
          Set once for the organization, not per rule — a URL repeated on twenty
          rules is nineteen places to forget when it rotates. Every firing also
          appears in the app, and that copy is sent first so it is not lost when
          one of these is down.
        </Text>
      </Box>

      {refusal && (
        <Flash variant="danger">
          <Text sx={{ fontSize: 1 }}>{refusal}</Text>
        </Flash>
      )}

      <FormControl>
        <FormControl.Label>Email</FormControl.Label>
        <TextInput
          block
          disabled={readOnly}
          value={draft.alertEmails}
          onChange={event => set('alertEmails', event.target.value)}
          placeholder="ops@example.co, oncall@example.co"
        />
        <FormControl.Caption>
          Comma-separated, up to twenty. An alert list is the people who want to
          know, not a mailing list — a firing that emails two hundred people is
          a firing that gets the rule switched off.
        </FormControl.Caption>
      </FormControl>

      <FormControl>
        <FormControl.Label>Slack</FormControl.Label>
        <TextInput
          block
          disabled={readOnly}
          value={draft.alertSlackWebhookUrl}
          onChange={event => set('alertSlackWebhookUrl', event.target.value)}
          placeholder="https://hooks.slack.com/services/…"
        />
        <FormControl.Caption>
          A Slack incoming webhook, and only Slack&rsquo;s — anything else
          belongs in the field below. Through this one Slack gets a coloured
          attachment with the reading, the severity and the scope as separate
          fields; through the generic webhook it shows one grey line.
        </FormControl.Caption>
      </FormControl>

      <FormControl>
        <FormControl.Label>Webhook</FormControl.Label>
        <TextInput
          block
          disabled={readOnly}
          value={draft.alertWebhookUrl}
          onChange={event => set('alertWebhookUrl', event.target.value)}
          placeholder="https://events.pagerduty.com/…"
        />
        <FormControl.Caption>
          Anything that takes a JSON POST: PagerDuty, a chat relay, your own
          endpoint. <strong>https only</strong> — an alert names your
          organization and what its agents did. It carries no credential.
        </FormControl.Caption>
      </FormControl>

      {!readOnly && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="primary"
            onClick={apply}
            disabled={!changed || save.isPending}
          >
            Save destinations
          </Button>
          {changed && (
            <Button variant="invisible" onClick={() => setDraft(stored)}>
              Discard changes
            </Button>
          )}
        </Box>
      )}

      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
        Each copy is attempted on its own: if the webhook is down you still get
        the email. A copy that fails is recorded and{' '}
        <strong>not retried</strong> — retrying a notice against an endpoint
        that is down turns its outage into a loop against it, and the alert is
        already in the app.
      </Text>
    </Box>
  );
};

export default AlertDestinations;
