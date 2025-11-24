/*
 * Copyright (c) 2024-2025 Datalayer, Inc.
 *
 * BSD 3-Clause License
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  IconButton,
  Textarea,
  Select,
  FormControl,
  Spinner,
  ActionMenu,
  ActionList,
} from '@primer/react';
import { GearIcon, ArrowUpIcon, ArrowDownIcon } from '@primer/octicons-react';
import { useAIJupyterChat } from '../../hooks/useAIJupyterChat';
import { requestAPI } from './handler';
import { MessagePart } from './MessagePart';

interface IModelConfig {
  id: string;
  name: string;
  builtinTools?: string[];
}

interface IBuiltinTool {
  name: string;
  id: string;
}

interface IRemoteConfig {
  models: IModelConfig[];
  builtinTools: IBuiltinTool[];
}

async function getModels() {
  return await requestAPI<IRemoteConfig>('configure');
}

/**
 * Main Chat component using Primer React
 */
export const ChatComponent: React.FC = () => {
  const [model, setModel] = useState<string>('');
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { messages, sendMessage, status, regenerate } = useAIJupyterChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const configQuery = useQuery({
    queryFn: getModels,
    queryKey: ['models'],
  });

  useEffect(() => {
    if (configQuery.data) {
      setModel(configQuery.data.models[0].id);

      // Enable all builtin tools by default
      const allToolIds =
        configQuery.data.builtinTools?.map(tool => tool.id) || [];
      setEnabledTools(allToolIds);
    }
  }, [configQuery.data]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isScrolledUp =
        container.scrollHeight - container.scrollTop - container.clientHeight >
        100;
      setShowScrollButton(isScrolledUp);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && status !== 'streaming') {
      sendMessage(
        { text: inputValue },
        {
          body: { model, builtinTools: enabledTools },
        },
      ).catch((error: unknown) => {
        console.error('Error sending message:', error);
      });
      setInputValue('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const regen = (id: string) => {
    regenerate({ messageId: id }).catch((error: unknown) => {
      console.error('Error regenerating message:', error);
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const availableTools = useMemo(() => {
    if (!configQuery.data) return [];

    const selectedModel = configQuery.data.models.find(
      entry => entry.id === model,
    );

    const enabledToolIds = selectedModel?.builtinTools ?? [];

    // If model doesn't specify tools, show all builtin tools
    const tools =
      enabledToolIds.length > 0
        ? (configQuery.data.builtinTools?.filter(tool =>
            enabledToolIds.includes(tool.id),
          ) ?? [])
        : (configQuery.data.builtinTools ?? []);

    return tools;
  }, [configQuery.data, model]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Messages Container */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 3,
          paddingBottom: 4,
        }}
      >
        {messages.map(message => (
          <Box key={message.id} sx={{ marginBottom: 3 }}>
            {message.parts.map((part, index) => (
              <MessagePart
                key={`${message.id}-${index}`}
                part={part}
                message={message}
                status={status}
                index={index}
                regen={regen}
                lastMessage={message.id === messages.at(-1)?.id}
              />
            ))}
          </Box>
        ))}
        {status === 'submitted' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 3 }}>
            <Spinner size="medium" />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 160,
            right: 16,
            zIndex: 1,
          }}
        >
          <IconButton
            icon={ArrowDownIcon}
            aria-label="Scroll to bottom"
            onClick={scrollToBottom}
            variant="default"
            size="medium"
          />
        </Box>
      )}

      {/* Input Area - Fixed at bottom */}
      <Box
        sx={{
          flexShrink: 0,
          borderTop: '1px solid',
          borderColor: 'border.default',
          padding: 3,
          backgroundColor: 'canvas.default',
          zIndex: 2,
        }}
      >
        <form onSubmit={handleSubmit}>
          <FormControl sx={{ width: '100%' }}>
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              rows={3}
              resize="vertical"
              sx={{ marginBottom: 2, width: '100%' }}
            />
          </FormControl>

          {/* Footer with Tools and Submit */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* Tools Menu */}
              {availableTools.length > 0 && (
                <ActionMenu>
                  <ActionMenu.Anchor>
                    <IconButton
                      icon={GearIcon}
                      aria-label="Tools"
                      variant="invisible"
                    />
                  </ActionMenu.Anchor>
                  <ActionMenu.Overlay>
                    <ActionList>
                      <ActionList.Group title="Available Tools">
                        {availableTools.map(tool => (
                          <ActionList.Item key={tool.id} disabled>
                            <ActionList.LeadingVisual>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: 'success.emphasis',
                                }}
                              />
                            </ActionList.LeadingVisual>
                            {tool.name}
                          </ActionList.Item>
                        ))}
                      </ActionList.Group>
                    </ActionList>
                  </ActionMenu.Overlay>
                </ActionMenu>
              )}

              {/* Model Select */}
              {configQuery.data && model && (
                <Select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  {configQuery.data.models.map(modelItem => (
                    <Select.Option key={modelItem.id} value={modelItem.id}>
                      {modelItem.name}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              disabled={!inputValue.trim() || status === 'streaming'}
              leadingVisual={ArrowUpIcon}
            >
              {status === 'streaming' ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
};
