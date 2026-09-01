/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * What this organization asked to be told about.
 *
 * A rule is a condition over a number the gateway already counts, checked
 * once a minute, firing at most once per condition per window. The
 * evaluator has been able to evaluate these since milestone 1; until this
 * page they could only be written with `curl`.
 *
 * The form is built from the vocabulary the evaluator publishes, and that
 * is the point rather than a convenience. A rule it cannot evaluate is
 * refused at the write — and a rule that never fires because of a typo is
 * indistinguishable from a condition that never happened, which is what
 * somebody will believe. A dropdown cannot produce one.
 *
 * The same reasoning runs one level deeper. A condition the evaluator knows
 * but has **no reader** for is stored, evaluated every minute, counted
 * `unreadable`, and never fires — worse than a typo, because it looks
 * configured. Those are shown as not yet measurable and cannot be chosen.
 *
 * @module views/mcp/AlertRules
 */

import { useMemo, useRef, useState } from 'react';
import {
  ActionList,
  ActionMenu,
  Button,
  Flash,
  FormControl,
  Heading,
  Label,
  Select,
  Spinner,
  Text,
  TextInput,
  ToggleSwitch,
} from '@primer/react';
import { Blankslate, DataTable, Dialog, Table } from '@primer/react/experimental';
import type { DataTableProps } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import { BellIcon, KebabHorizontalIcon } from '@primer/octicons-react';
import { McpErrorBlankslate } from '../../components/mcp';
import { AlertDestinations } from './AlertDestinations';
import {
  useAlertRules,
  useTestAlertRule,
  useCreateAlertRule,
  useDeleteAlertRule,
  useUpdateAlertRule,
} from '../../hooks/useMcp';
import { useToast } from '../../hooks';
import {
  ALERT_CONDITIONS,
  ALERT_OPERATORS,
  ALERT_SEVERITIES,
  AlertRuleInvalid,
  type McpAlertRule,
  type McpAlertRuleDraft,
} from '../../api/iam/mcpAlertRules';
import type { McpAlertRuleTrial } from '../../api/mcp/alerts';
import type { McpErrorStateFn } from './types';

export interface AlertRulesProps {
  errorState: McpErrorStateFn;
  orgUid: string;
  /** Read-only for anybody who is not an owner. */
  readOnly?: boolean;
  showTitle?: boolean;
}

type RuleRow = McpAlertRule & { id: string };

/** The windows worth offering, in seconds. */
const WINDOWS: { seconds: number; label: string }[] = [
  { seconds: 300, label: '5 minutes' },
  { seconds: 900, label: '15 minutes' },
  { seconds: 3600, label: 'an hour' },
  { seconds: 21600, label: '6 hours' },
  { seconds: 86400, label: 'a day' },
];

const MEASURABLE = ALERT_CONDITIONS.filter(condition => condition.measurable);

const BLANK: McpAlertRuleDraft = {
  condition: MEASURABLE[0]?.name ?? 'tasks.open',
  operator: 'gt',
  threshold: 1,
  severity: 'warning',
  windowSeconds: 3600,
  scopeKind: 'organization',
  scopeUid: '',
  enabled: true,
};

const labelOf = (condition: string): string =>
  ALERT_CONDITIONS.find(entry => entry.name === condition)?.label ?? condition;

const operatorOf = (operator: string): string =>
  ALERT_OPERATORS.find(entry => entry.name === operator)?.label ?? operator;

const windowOf = (seconds: number): string =>
  WINDOWS.find(entry => entry.seconds === seconds)?.label ?? `${seconds}s`;

export const AlertRules = ({
  errorState,
  orgUid,
  readOnly = false,
  showTitle = true,
}: AlertRulesProps): JSX.Element => {
  const { enqueueToast } = useToast();
  const rules = useAlertRules(orgUid);
  const create = useCreateAlertRule(orgUid);
  const update = useUpdateAlertRule(orgUid);
  const remove = useDeleteAlertRule(orgUid);
  const test = useTestAlertRule();

  const [editing, setEditing] = useState<McpAlertRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<McpAlertRuleDraft>(BLANK);
  const [refusal, setRefusal] = useState('');
  const [trial, setTrial] = useState<McpAlertRuleTrial | null>(null);
  const [removing, setRemoving] = useState<RuleRow | null>(null);
  const returnFocusRef = useRef<HTMLElement>(null);

  const rows = useMemo<RuleRow[]>(
    () => (rules.data ?? []).map(rule => ({ ...rule, id: rule.uid })),
    [rules.data],
  );

  const openCreate = () => {
    setDraft(BLANK);
    setRefusal('');
    setTrial(null);
    setCreating(true);
  };

  const openEdit = (rule: McpAlertRule) => {
    const { uid, orgUid: _org, version: _version, ...rest } = rule;
    setDraft(rest);
    setRefusal('');
    setTrial(null);
    setEditing(rule);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setRefusal('');
  };

  const onError = (error: Error) => {
    if (error instanceof AlertRuleInvalid) {
      // The evaluator's own words, beside the form rather than in a toast:
      // it names what is wrong, and the person can still fix it.
      setRefusal(error.message);
      return;
    }
    enqueueToast(`Could not save the rule: ${error.message}`, { variant: 'error' });
  };

  const apply = () => {
    setRefusal('');
    if (draft.scopeKind !== 'organization' && !draft.scopeUid.trim()) {
      setRefusal(
        `A ${draft.scopeKind} rule needs the ${draft.scopeKind} it is about. ` +
          'Without one it would be measured over the whole organization ' +
          'under a name saying otherwise.',
      );
      return;
    }
    if (!Number.isFinite(draft.threshold)) {
      setRefusal('The threshold must be a number.');
      return;
    }
    if (editing) {
      update.mutate(
        { uid: editing.uid, rule: draft },
        {
          onSuccess: () => {
            close();
            enqueueToast('Rule saved.', { variant: 'success' });
          },
          onError,
        },
      );
      return;
    }
    create.mutate(draft, {
      onSuccess: () => {
        close();
        enqueueToast('Rule created. It is evaluated on the next tick.', {
          variant: 'success',
        });
      },
      onError,
    });
  };

  /** Switching a rule off leaves it here; it stops being evaluated. */
  const toggle = (rule: McpAlertRule, enabled: boolean) => {
    const { uid, orgUid: _org, version: _version, ...rest } = rule;
    update.mutate(
      { uid, rule: { ...rest, enabled } },
      {
        onError: error =>
          enqueueToast(`Could not change the rule: ${error.message}`, {
            variant: 'error',
          }),
      },
    );
  };

  const confirmRemove = () => {
    const rule = removing;
    if (!rule) {
      return;
    }
    remove.mutate(rule.uid, {
      onSuccess: () => {
        setRemoving(null);
        enqueueToast('Rule removed. What it watched is unwatched.', {
          variant: 'success',
        });
      },
      onError: error => {
        setRemoving(null);
        enqueueToast(`Could not remove: ${error.message}`, { variant: 'error' });
      },
    });
  };

  const set = <K extends keyof McpAlertRuleDraft>(
    key: K,
    value: McpAlertRuleDraft[K],
  ) => {
    // A reading belongs to the rule that produced it. Left on screen after
    // the condition changes, it would be somebody reading last question's
    // answer as this question's.
    setTrial(null);
    setDraft(current => ({ ...current, [key]: value }));
  };

  const tryIt = () => {
    setRefusal('');
    test.mutate(
      {
        condition: draft.condition,
        operator: draft.operator,
        threshold: draft.threshold,
        windowSeconds: draft.windowSeconds,
        scopeKind: draft.scopeKind,
        scopeUid: draft.scopeUid,
      },
      {
        onSuccess: setTrial,
        onError: error => setRefusal(error.message),
      },
    );
  };

  const columns: DataTableProps<RuleRow>['columns'] = [
    {
      header: 'Tell me when',
      id: 'condition',
      rowHeader: true,
      width: 'growCollapse',
      renderCell: row => (
        <Box sx={{ display: 'grid' }}>
          <Text sx={{ fontSize: 1 }}>
            {labelOf(row.condition)} {operatorOf(row.operator)} {row.threshold}
          </Text>
          <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
            over {windowOf(row.windowSeconds)}
            {row.scopeKind !== 'organization' && ` · this ${row.scopeKind}`}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Severity',
      id: 'severity',
      width: '110px',
      renderCell: row => (
        <Label
          size="small"
          variant={
            row.severity === 'critical'
              ? 'danger'
              : row.severity === 'warning'
                ? 'attention'
                : 'secondary'
          }
        >
          {row.severity}
        </Label>
      ),
    },
    {
      header: 'On',
      id: 'enabled',
      width: '90px',
      renderCell: row => (
        // The label is drawn and hidden rather than passed as `aria-label`:
        // Primer's switch names itself from an element, and a row of
        // unlabelled switches is a row a screen reader reads as "on, on,
        // off" with nothing said about what.
        <>
          <Text id={`alert-toggle-${row.uid}`} sx={{ display: 'none' }}>
            {`Evaluate ${labelOf(row.condition)}`}
          </Text>
          <ToggleSwitch
            size="small"
            checked={row.enabled}
            disabled={readOnly || update.isPending}
            aria-labelledby={`alert-toggle-${row.uid}`}
            onClick={() => toggle(row, !row.enabled)}
          />
        </>
      ),
    },
    {
      header: '',
      id: 'actions',
      width: '48px',
      align: 'end',
      renderCell: row =>
        readOnly ? (
          <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>—</Text>
        ) : (
          <ActionMenu>
            <ActionMenu.Anchor>
              <Button
                variant="invisible"
                size="small"
                aria-label={`Actions for ${labelOf(row.condition)}`}
                icon={KebabHorizontalIcon}
              />
            </ActionMenu.Anchor>
            <ActionMenu.Overlay align="end">
              <ActionList>
                <ActionList.Item onSelect={() => openEdit(row)}>Edit</ActionList.Item>
                <ActionList.Item variant="danger" onSelect={() => setRemoving(row)}>
                  Remove
                </ActionList.Item>
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        ),
    },
  ];

  if (rules.isError) {
    return (
      <McpErrorBlankslate
        state={errorState(rules.error, 'Alert rules')}
        onRetry={() => rules.refetch()}
      />
    );
  }

  const chosen = ALERT_CONDITIONS.find(entry => entry.name === draft.condition);

  return (
    <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
      {showTitle && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'start',
            justifyContent: 'space-between',
            gap: 3,
          }}
        >
          <Box>
            <Heading as="h2" sx={{ fontSize: 3, mb: 1 }}>
              Alerts
            </Heading>
            <Text as="p" sx={{ color: 'fg.muted', fontSize: 1, m: 0 }}>
              What this organization asked to be told about. Each rule is
              checked once a minute and fires at most once per window.
            </Text>
          </Box>
          {!readOnly && (
            <Button variant="primary" onClick={openCreate}>
              New rule
            </Button>
          )}
        </Box>
      )}

      {rules.isPending && !rules.data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <Spinner />
        </Box>
      ) : rows.length > 0 ? (
        <Table.Container>
          <Table.Title as="h3" id="alert-rules">
            Rules
          </Table.Title>
          <Table.Subtitle as="p" id="alert-rules-subtitle">
            A rule switched off stays here and stops being evaluated.
          </Table.Subtitle>
          <DataTable
            aria-labelledby="alert-rules"
            aria-describedby="alert-rules-subtitle"
            data={rows}
            columns={columns}
          />
        </Table.Container>
      ) : (
        <Blankslate border spacious>
          <Blankslate.Visual>
            <BellIcon size="medium" />
          </Blankslate.Visual>
          <Blankslate.Heading>Nothing is watched</Blankslate.Heading>
          <Blankslate.Description>
            <Text sx={{ textAlign: 'center' }}>
              Runs are recorded either way. A rule is what turns a number
              somebody would have to go and look at into something that
              reaches you.
            </Text>
          </Blankslate.Description>
          {!readOnly && (
            <Button size="small" onClick={openCreate}>
              New rule
            </Button>
          )}
        </Blankslate>
      )}

      <AlertDestinations
        errorState={errorState}
        orgUid={orgUid}
        readOnly={readOnly}
      />

      {(creating || editing) && (
        <Dialog
          title={editing ? 'Edit rule' : 'New alert rule'}
          onClose={close}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            { buttonType: 'default', content: 'Cancel', onClick: close },
            {
              buttonType: 'default',
              content: test.isPending ? 'Testing…' : 'Test',
              onClick: tryIt,
              disabled: test.isPending || !draft.condition,
            },
            {
              buttonType: 'primary',
              content: editing ? 'Save' : 'Create',
              onClick: apply,
              disabled: create.isPending || update.isPending,
            },
          ]}
        >
          <Box sx={{ display: 'grid', gap: 3 }}>
            {refusal && (
              <Flash variant="danger">
                <Text sx={{ fontSize: 1 }}>{refusal}</Text>
              </Flash>
            )}

            {trial && (
              <Flash variant={trial.readable ? 'default' : 'warning'}>
                <Text sx={{ fontSize: 1 }}>
                  {trial.readable
                    ? `Right now it reads ${trial.value}, so this rule ${
                        trial.wouldFire ? 'would fire' : 'would not fire'
                      }.`
                    : 'This cannot be read at the moment, so the rule would ' +
                      'not fire — and a rule that never fires looks exactly ' +
                      'like a condition that never happens.'}
                </Text>
                {trial.detail && (
                  <Text as="p" sx={{ fontSize: 0, color: 'fg.muted', mt: 1, mb: 0 }}>
                    {trial.detail}
                  </Text>
                )}
              </Flash>
            )}

            <FormControl>
              <FormControl.Label>Tell me when</FormControl.Label>
              <Select
                value={draft.condition}
                onChange={event => set('condition', event.target.value)}
              >
                {ALERT_CONDITIONS.map(condition => (
                  <Select.Option
                    key={condition.name}
                    value={condition.name}
                    // A condition nothing reads would be stored, evaluated
                    // every minute and never fire. Offering it as though it
                    // worked is the silence rules exist to break.
                    disabled={!condition.measurable}
                  >
                    {condition.label}
                    {condition.measurable ? '' : ' — not measurable yet'}
                  </Select.Option>
                ))}
              </Select>
              {chosen && (
                <FormControl.Caption>{chosen.help}</FormControl.Caption>
              )}
            </FormControl>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <FormControl>
                <FormControl.Label>Comparison</FormControl.Label>
                <Select
                  value={draft.operator}
                  onChange={event => set('operator', event.target.value)}
                >
                  {ALERT_OPERATORS.map(operator => (
                    <Select.Option key={operator.name} value={operator.name}>
                      {operator.label}
                    </Select.Option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormControl.Label>Threshold</FormControl.Label>
                <TextInput
                  block
                  type="number"
                  value={String(draft.threshold)}
                  onChange={event => set('threshold', Number(event.target.value))}
                />
              </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <FormControl>
                <FormControl.Label>Over</FormControl.Label>
                <Select
                  value={String(draft.windowSeconds)}
                  onChange={event => set('windowSeconds', Number(event.target.value))}
                >
                  {WINDOWS.map(window => (
                    <Select.Option key={window.seconds} value={String(window.seconds)}>
                      {window.label}
                    </Select.Option>
                  ))}
                </Select>
                <FormControl.Caption>
                  It fires once per window, not once per check.
                </FormControl.Caption>
              </FormControl>

              <FormControl>
                <FormControl.Label>Severity</FormControl.Label>
                <Select
                  value={draft.severity}
                  onChange={event =>
                    set('severity', event.target.value as typeof draft.severity)
                  }
                >
                  {ALERT_SEVERITIES.map(severity => (
                    <Select.Option key={severity} value={severity}>
                      {severity}
                    </Select.Option>
                  ))}
                </Select>
                <FormControl.Caption>
                  Sets the colour in Slack and the wording of the notice.
                </FormControl.Caption>
              </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <FormControl>
                <FormControl.Label>Measured over</FormControl.Label>
                <Select
                  value={draft.scopeKind}
                  onChange={event =>
                    set('scopeKind', event.target.value as typeof draft.scopeKind)
                  }
                >
                  <Select.Option value="organization">
                    The whole organization
                  </Select.Option>
                  <Select.Option value="team">One team</Select.Option>
                  <Select.Option value="user">One person</Select.Option>
                  <Select.Option value="agent">One agent</Select.Option>
                </Select>
              </FormControl>

              {draft.scopeKind !== 'organization' && (
                <FormControl required>
                  <FormControl.Label>Which {draft.scopeKind}</FormControl.Label>
                  <TextInput
                    block
                    value={draft.scopeUid}
                    onChange={event => set('scopeUid', event.target.value)}
                    placeholder="uid"
                  />
                  <FormControl.Caption>
                    Without one the rule would be measured over the whole
                    organization under a name saying otherwise.
                  </FormControl.Caption>
                </FormControl>
              )}
            </Box>
          </Box>
        </Dialog>
      )}

      {removing && (
        <Dialog
          title="Remove this rule?"
          onClose={() => setRemoving(null)}
          returnFocusRef={returnFocusRef}
          footerButtons={[
            { buttonType: 'default', content: 'Keep it', onClick: () => setRemoving(null) },
            {
              buttonType: 'danger',
              content: 'Remove',
              onClick: confirmRemove,
              disabled: remove.isPending,
            },
          ]}
        >
          <Text sx={{ fontSize: 1 }}>
            What it watched is unwatched from the next check, and nothing will
            say so again. If you only want it quiet for now, switch it off
            instead — it stays in the list.
          </Text>
        </Dialog>
      )}
    </Box>
  );
};

export default AlertRules;
