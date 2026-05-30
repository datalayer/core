/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useMemo, useState } from 'react';
import {
  ActionList,
  ActionMenu,
  Box,
  Button,
  FormControl,
  Text,
  TextInput,
} from '@primer/react';
import { Dialog } from '@primer/react/experimental';

export type ShareScope = 'user' | 'team' | 'organization' | 'everyone';

export type ShareRule = {
  scope: ShareScope;
  target?: string;
};

export type ShareAccessDialogProps = {
  isOpen: boolean;
  title?: string;
  initialRules?: ShareRule[];
  onSave: (rules: ShareRule[]) => void;
  onClose: () => void;
};

export function ShareAccessDialog(props: ShareAccessDialogProps) {
  const {
    isOpen,
    title = 'Share Access',
    initialRules = [],
    onSave,
    onClose,
  } = props;
  const [rules, setRules] = useState<ShareRule[]>(initialRules);
  const [scope, setScope] = useState<ShareScope>('user');
  const [target, setTarget] = useState('');

  const canAdd = useMemo(() => {
    if (scope === 'everyone') {
      return true;
    }
    return target.trim().length > 0;
  }, [scope, target]);

  const addRule = () => {
    if (!canAdd) {
      return;
    }
    setRules(prev => [
      ...prev,
      {
        scope,
        target: scope === 'everyone' ? undefined : target.trim(),
      },
    ]);
    setTarget('');
  };

  const removeRule = (index: number) => {
    setRules(prev => prev.filter((_, idx) => idx !== index));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog onClose={onClose}>
      <Dialog.Header>{title}</Dialog.Header>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'end' }}>
          <FormControl sx={{ minWidth: 220 }}>
            <FormControl.Label>Scope</FormControl.Label>
            <ActionMenu>
              <ActionMenu.Button>{scope}</ActionMenu.Button>
              <ActionMenu.Overlay>
                <ActionList>
                  <ActionList.Item onSelect={() => setScope('user')}>
                    user
                  </ActionList.Item>
                  <ActionList.Item onSelect={() => setScope('team')}>
                    team
                  </ActionList.Item>
                  <ActionList.Item onSelect={() => setScope('organization')}>
                    organization
                  </ActionList.Item>
                  <ActionList.Item onSelect={() => setScope('everyone')}>
                    everyone
                  </ActionList.Item>
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>
          </FormControl>
          <FormControl sx={{ flex: 1 }}>
            <FormControl.Label>Target</FormControl.Label>
            <TextInput
              disabled={scope === 'everyone'}
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder={
                scope === 'user'
                  ? 'user handle or uid'
                  : scope === 'team'
                    ? 'team handle or uid'
                    : scope === 'organization'
                      ? 'organization handle or uid'
                      : 'all principals'
              }
            />
          </FormControl>
          <Button onClick={addRule} disabled={!canAdd}>
            Add
          </Button>
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {rules.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Text sx={{ color: 'fg.muted' }}>No sharing rules yet.</Text>
            </Box>
          ) : (
            rules.map((rule, index) => (
              <Box
                key={`${rule.scope}-${rule.target || 'everyone'}-${index}`}
                sx={{
                  p: 3,
                  borderTop: index === 0 ? 'none' : '1px solid',
                  borderColor: 'border.default',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text>
                  {rule.scope}
                  {rule.target ? `: ${rule.target}` : ''}
                </Text>
                <Button
                  size="small"
                  variant="invisible"
                  onClick={() => removeRule(index)}
                >
                  Remove
                </Button>
              </Box>
            ))
          )}
        </Box>
      </Box>
      <Dialog.Footer>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(rules)}>
          Save
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}

export default ShareAccessDialog;
