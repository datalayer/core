/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  FormControl,
  TextInput,
  Select,
  Label,
  ProgressBar,
  Timeline,
  ActionList,
  ActionMenu,
} from '@primer/react';
import {
  PlayIcon,
  StopIcon,
  SyncIcon,
  TrashIcon,
  ServerIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  KebabHorizontalIcon,
} from '@primer/octicons-react';
import { useCoreStore } from '@datalayer/core';

interface Runtime {
  id: string;
  name: string;
  environment: string;
  status: 'running' | 'stopped' | 'starting' | 'error';
  cpu: number;
  memory: number;
  createdAt: Date;
  lastActive: Date;
}

const RuntimeManager: React.FC = () => {
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [creating, setCreating] = useState(false);
  const [newRuntimeName, setNewRuntimeName] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState('python-3.11');
  const { configuration } = useCoreStore();

  // Simulate loading existing runtimes
  useEffect(() => {
    const sampleRuntimes: Runtime[] = [
      {
        id: 'runtime-1',
        name: 'Development Runtime',
        environment: 'python-3.11',
        status: 'running',
        cpu: 2,
        memory: 4,
        createdAt: new Date(Date.now() - 86400000),
        lastActive: new Date(),
      },
      {
        id: 'runtime-2',
        name: 'Data Analysis',
        environment: 'r-4.3',
        status: 'stopped',
        cpu: 4,
        memory: 8,
        createdAt: new Date(Date.now() - 172800000),
        lastActive: new Date(Date.now() - 3600000),
      },
    ];

    if (configuration?.token) {
      setRuntimes(sampleRuntimes);
    }
  }, [configuration]);

  const handleCreateRuntime = async () => {
    if (!newRuntimeName) return;

    setCreating(true);

    // Simulate runtime creation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newRuntime: Runtime = {
      id: `runtime-${Date.now()}`,
      name: newRuntimeName,
      environment: selectedEnvironment,
      status: 'starting',
      cpu: 2,
      memory: 4,
      createdAt: new Date(),
      lastActive: new Date(),
    };

    setRuntimes([...runtimes, newRuntime]);
    setNewRuntimeName('');
    setCreating(false);

    // Simulate runtime startup
    setTimeout(() => {
      setRuntimes(prev =>
        prev.map(r =>
          r.id === newRuntime.id ? { ...r, status: 'running' } : r
        )
      );
    }, 3000);
  };

  const handleRuntimeAction = async (
    runtimeId: string,
    action: 'start' | 'stop' | 'restart' | 'delete'
  ) => {
    setRuntimes(prev =>
      prev.map(r => {
        if (r.id !== runtimeId) return r;

        switch (action) {
          case 'start':
            return { ...r, status: 'starting' };
          case 'stop':
            return { ...r, status: 'stopped' };
          case 'restart':
            return { ...r, status: 'starting' };
          case 'delete':
            return r;
          default:
            return r;
        }
      })
    );

    if (action === 'delete') {
      setTimeout(() => {
        setRuntimes(prev => prev.filter(r => r.id !== runtimeId));
      }, 500);
    } else if (action === 'start' || action === 'restart') {
      setTimeout(() => {
        setRuntimes(prev =>
          prev.map(r => (r.id === runtimeId ? { ...r, status: 'running' } : r))
        );
      }, 2000);
    }
  };

  const getStatusColor = (status: string): any => {
    switch (status) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'default';
      case 'starting':
        return 'attention';
      case 'error':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircleIcon />;
      case 'stopped':
        return <XCircleIcon />;
      case 'starting':
        return <ClockIcon />;
      case 'error':
        return <XCircleIcon />;
      default:
        return <ServerIcon />;
    }
  };

  if (!configuration?.token) {
    return (
      <Box>
        <Heading as="h2" sx={{ mb: 2 }}>
          Runtime Management
        </Heading>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bg: 'canvas.subtle',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <ServerIcon size={48} />
          <Text sx={{ mt: 2, display: 'block' }}>
            Connect to Datalayer to manage cloud runtimes
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Heading as="h2" sx={{ mb: 2 }}>
          Runtime Management
        </Heading>
        <Text sx={{ color: 'fg.subtle' }}>
          Create and manage compute runtimes for your notebooks
        </Text>
      </Box>

      {/* Create Runtime Form */}
      <Box
        sx={{
          p: 3,
          mb: 4,
          bg: 'canvas.subtle',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'border.default',
        }}
      >
        <Heading as="h3" sx={{ fontSize: 2, mb: 3 }}>
          Create New Runtime
        </Heading>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'end' }}>
          <FormControl sx={{ flex: 1 }}>
            <FormControl.Label>Runtime Name</FormControl.Label>
            <TextInput
              value={newRuntimeName}
              onChange={e => setNewRuntimeName(e.target.value)}
              placeholder="e.g., ML Training"
              disabled={creating}
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Environment</FormControl.Label>
            <Select
              value={selectedEnvironment}
              onChange={e => setSelectedEnvironment(e.target.value)}
              disabled={creating}
            >
              <Select.Option value="python-3.11">Python 3.11</Select.Option>
              <Select.Option value="python-3.10">Python 3.10</Select.Option>
              <Select.Option value="r-4.3">R 4.3</Select.Option>
              <Select.Option value="julia-1.9">Julia 1.9</Select.Option>
            </Select>
          </FormControl>

          <Button
            variant="primary"
            onClick={handleCreateRuntime}
            disabled={!newRuntimeName || creating}
          >
            <PlayIcon />
            {creating ? 'Creating...' : 'Create Runtime'}
          </Button>
        </Box>
      </Box>

      {/* Runtimes List */}
      {runtimes.length > 0 ? (
        <Timeline>
          {runtimes.map(runtime => (
            <Timeline.Item key={runtime.id}>
              <Timeline.Badge>{getStatusIcon(runtime.status)}</Timeline.Badge>
              <Timeline.Body>
                <Box
                  sx={{
                    p: 3,
                    mb: 2,
                    bg: 'canvas.subtle',
                    border: '1px solid',
                    borderColor: 'border.default',
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          mb: 1,
                        }}
                      >
                        <Heading as="h4" sx={{ fontSize: 2 }}>
                          {runtime.name}
                        </Heading>
                        <Label variant={getStatusColor(runtime.status)}>
                          {runtime.status}
                        </Label>
                      </Box>

                      <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 2 }}>
                        Environment: {runtime.environment} | {runtime.cpu} CPUs
                        | {runtime.memory}GB RAM
                      </Text>

                      <Text sx={{ fontSize: 0, color: 'fg.subtle' }}>
                        Created: {runtime.createdAt.toLocaleDateString()} | Last
                        Active: {runtime.lastActive.toLocaleTimeString()}
                      </Text>
                    </Box>

                    <ActionMenu>
                      <ActionMenu.Anchor>
                        <Button size="small" aria-label="Runtime actions">
                          <KebabHorizontalIcon />
                        </Button>
                      </ActionMenu.Anchor>
                      <ActionMenu.Overlay>
                        <ActionList>
                          {runtime.status === 'stopped' && (
                            <ActionList.Item
                              onSelect={() =>
                                handleRuntimeAction(runtime.id, 'start')
                              }
                            >
                              <ActionList.LeadingVisual>
                                <PlayIcon />
                              </ActionList.LeadingVisual>
                              Start
                            </ActionList.Item>
                          )}
                          {runtime.status === 'running' && (
                            <ActionList.Item
                              onSelect={() =>
                                handleRuntimeAction(runtime.id, 'stop')
                              }
                            >
                              <ActionList.LeadingVisual>
                                <StopIcon />
                              </ActionList.LeadingVisual>
                              Stop
                            </ActionList.Item>
                          )}
                          {runtime.status === 'running' && (
                            <ActionList.Item
                              onSelect={() =>
                                handleRuntimeAction(runtime.id, 'restart')
                              }
                            >
                              <ActionList.LeadingVisual>
                                <SyncIcon />
                              </ActionList.LeadingVisual>
                              Restart
                            </ActionList.Item>
                          )}
                          <ActionList.Divider />
                          <ActionList.Item
                            variant="danger"
                            onSelect={() =>
                              handleRuntimeAction(runtime.id, 'delete')
                            }
                          >
                            <ActionList.LeadingVisual>
                              <TrashIcon />
                            </ActionList.LeadingVisual>
                            Delete
                          </ActionList.Item>
                        </ActionList>
                      </ActionMenu.Overlay>
                    </ActionMenu>
                  </Box>

                  {runtime.status === 'running' && (
                    <Box sx={{ mt: 3 }}>
                      <Text sx={{ fontSize: 1, mb: 1 }}>Resource Usage</Text>
                      <Box sx={{ mb: 1 }}>
                        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                          CPU: 45%
                        </Text>
                        <ProgressBar progress={45} />
                      </Box>
                      <Box>
                        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                          Memory: 62%
                        </Text>
                        <ProgressBar progress={62} />
                      </Box>
                    </Box>
                  )}
                </Box>
              </Timeline.Body>
            </Timeline.Item>
          ))}
        </Timeline>
      ) : (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            bg: 'canvas.subtle',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <ServerIcon size={32} />
          <Text sx={{ mt: 2, display: 'block', color: 'fg.muted' }}>
            No runtimes created yet. Create your first runtime above.
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default RuntimeManager;
