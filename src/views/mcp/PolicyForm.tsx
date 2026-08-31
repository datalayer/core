/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The fields of a policy layer, and the reading of them a layer cannot get
 * wrong twice.
 *
 * One component for the organization's layer and a person's own, because
 * the rules are the same rules and two forms would be two chances to word
 * "an empty allowlist is not an allowlist" differently — the reading that
 * differs from the plain one is exactly the reading that must not drift.
 *
 * What the two callers do differ about is what a rule *means*. An
 * organization's layer is the floor everyone in it stands on; a person's
 * only narrows further, and cannot loosen. `notes` is how a caller says so
 * per field, beside the field, at the moment somebody is typing into it.
 *
 * @module views/mcp/PolicyForm
 */

import { FormControl, TextInput, Textarea, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import type { McpPolicyRules } from '../../api/iam/mcpPolicy';

/** The form's own shape: every field a string, as an input holds it. */
export type PolicyDraft = {
  toolDenylist: string;
  toolAllowlist: string;
  allowedClients: string;
  maxCallsPerMinute: string;
  maxCreditsPerDay: string;
  maxConcurrentSandboxes: string;
};

export const EMPTY_POLICY_DRAFT: PolicyDraft = {
  toolDenylist: '',
  toolAllowlist: '',
  allowedClients: '',
  maxCallsPerMinute: '',
  maxCreditsPerDay: '',
  maxConcurrentSandboxes: '',
};

/** A stored list as the textarea shows it: one entry a line. */
export const linesOf = (value: string[] | undefined): string =>
  (value ?? []).join('\n');

/**
 * A textarea back to a list, or `undefined` where nothing was typed.
 *
 * `undefined`, never `[]`. An empty array is a rule *set* to nothing, and
 * for an allowlist that is the difference between "I have not set one" and
 * a setting that refuses everything.
 */
export const listFrom = (value: string): string[] | undefined => {
  const entries = value
    .split('\n')
    .map(entry => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : undefined;
};

/** A number field back to a number, or `undefined` where left blank. */
export const numberFrom = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const textOf = (value: number | undefined): string =>
  value === undefined || value === null ? '' : String(value);

/** A stored layer as the form holds it. */
export const draftOf = (rules: McpPolicyRules | null | undefined): PolicyDraft => ({
  toolDenylist: linesOf(rules?.toolDenylist),
  toolAllowlist: linesOf(rules?.toolAllowlist),
  allowedClients: linesOf(rules?.allowedClients),
  maxCallsPerMinute: textOf(rules?.maxCallsPerMinute),
  maxCreditsPerDay: textOf(rules?.maxCreditsPerDay),
  maxConcurrentSandboxes: textOf(rules?.maxConcurrentSandboxes),
});

/**
 * The draft as it will be stored, or the reason it will not be.
 *
 * A cap of zero is caught here rather than at the write, because IAM's
 * refusal is correct and unhelpful: somebody who typed 0 meant "stop my
 * agents", and the answer they need is what to do instead.
 */
export const rulesFrom = (draft: PolicyDraft): McpPolicyRules | string => {
  const numbers: [keyof PolicyDraft, string][] = [
    ['maxCallsPerMinute', 'Calls per minute'],
    ['maxCreditsPerDay', 'Credits per day'],
    ['maxConcurrentSandboxes', 'Sandboxes at once'],
  ];
  for (const [key, label] of numbers) {
    const typed = draft[key].trim();
    if (!typed) {
      continue;
    }
    const parsed = Number(typed);
    if (!Number.isFinite(parsed)) {
      return `${label} must be a number, or empty for no limit.`;
    }
    if (parsed <= 0) {
      return (
        `${label} cannot be 0. A non-positive limit reads as *no limit*, so ` +
        'a zero written to stop your agents would lift the limit instead. ' +
        'To stop an agent, revoke its grant or deny the tools it uses.'
      );
    }
  }
  return {
    toolDenylist: listFrom(draft.toolDenylist),
    toolAllowlist: listFrom(draft.toolAllowlist),
    allowedClients: listFrom(draft.allowedClients),
    maxCallsPerMinute: numberFrom(draft.maxCallsPerMinute),
    maxCreditsPerDay: numberFrom(draft.maxCreditsPerDay),
    maxConcurrentSandboxes: numberFrom(draft.maxConcurrentSandboxes),
  };
};

export const policyChanged = (a: PolicyDraft, b: PolicyDraft): boolean =>
  (Object.keys(EMPTY_POLICY_DRAFT) as (keyof PolicyDraft)[]).some(
    key => a[key] !== b[key],
  );

export interface PolicyFormProps {
  draft: PolicyDraft;
  onChange: (key: keyof PolicyDraft, value: string) => void;
  disabled?: boolean;
  /**
   * A line drawn under one field, when this layer's reading of it needs
   * something said — "your organization already caps this at 30", say.
   *
   * Beside the field rather than at the top: somebody typing 60 into a box
   * needs to know while their hands are on it, not after they save.
   */
  notes?: Partial<Record<keyof PolicyDraft, React.ReactNode>>;
}

const Note = ({ children }: { children?: React.ReactNode }): JSX.Element | null =>
  children ? (
    <Text as="p" sx={{ fontSize: 0, color: 'attention.fg', mt: 1, mb: 0 }}>
      {children}
    </Text>
  ) : null;

export const PolicyForm = ({
  draft,
  onChange,
  disabled = false,
  notes = {},
}: PolicyFormProps): JSX.Element => (
  <Box sx={{ display: 'grid', gap: 3 }}>
    <FormControl>
      <FormControl.Label>Denied tools</FormControl.Label>
      <Textarea
        block
        rows={3}
        disabled={disabled}
        value={draft.toolDenylist}
        onChange={event => onChange('toolDenylist', event.target.value)}
        placeholder={'execute_cell\ndelete_file'}
      />
      <FormControl.Caption>
        One a line. A denial is added to every other layer&rsquo;s and can
        never be lifted by one.
      </FormControl.Caption>
      <Note>{notes.toolDenylist}</Note>
    </FormControl>

    <FormControl>
      <FormControl.Label>Permitted tools</FormControl.Label>
      <Textarea
        block
        rows={3}
        disabled={disabled}
        value={draft.toolAllowlist}
        onChange={event => onChange('toolAllowlist', event.target.value)}
        placeholder={'read_cell\nlist_notebooks'}
      />
      <FormControl.Caption>
        One a line, and everything else is refused. <strong>Leave it empty to
        set no allowlist</strong> — empty means &ldquo;I have not set
        one&rdquo;, not &ldquo;nothing is permitted&rdquo;, because the second
        would stop every agent at once.
      </FormControl.Caption>
      <Note>{notes.toolAllowlist}</Note>
    </FormControl>

    <FormControl>
      <FormControl.Label>Admitted clients</FormControl.Label>
      <Textarea
        block
        rows={3}
        disabled={disabled}
        value={draft.allowedClients}
        onChange={event => onChange('allowedClients', event.target.value)}
        placeholder={'https://claude.ai/.well-known/mcp-client.json\ncursor.com'}
      />
      <FormControl.Caption>
        A client&rsquo;s document URL, or just its hostname. Empty is not an
        allowlist, for the same reason as above.
      </FormControl.Caption>
      <Note>{notes.allowedClients}</Note>
    </FormControl>

    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: ['1fr', '1fr 1fr 1fr'] }}>
      <FormControl>
        <FormControl.Label>Calls per minute</FormControl.Label>
        <TextInput
          block
          type="number"
          min={1}
          disabled={disabled}
          value={draft.maxCallsPerMinute}
          onChange={event => onChange('maxCallsPerMinute', event.target.value)}
        />
        <FormControl.Caption>Empty for no limit.</FormControl.Caption>
        <Note>{notes.maxCallsPerMinute}</Note>
      </FormControl>

      <FormControl>
        <FormControl.Label>Credits per day</FormControl.Label>
        <TextInput
          block
          type="number"
          min={1}
          disabled={disabled}
          value={draft.maxCreditsPerDay}
          onChange={event => onChange('maxCreditsPerDay', event.target.value)}
        />
        <FormControl.Caption>
          Checked before a launch, never mid-session.
        </FormControl.Caption>
        <Note>{notes.maxCreditsPerDay}</Note>
      </FormControl>

      <FormControl>
        <FormControl.Label>Sandboxes at once</FormControl.Label>
        <TextInput
          block
          type="number"
          min={1}
          disabled={disabled}
          value={draft.maxConcurrentSandboxes}
          onChange={event => onChange('maxConcurrentSandboxes', event.target.value)}
        />
        <FormControl.Caption>
          Counted across the layer that set it.
        </FormControl.Caption>
        <Note>{notes.maxConcurrentSandboxes}</Note>
      </FormControl>
    </Box>
  </Box>
);

export default PolicyForm;
