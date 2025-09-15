/**
 * @module renderer/components/document/LexicalEditor
 * @description Rich text editor component with Jupyter integration and collaboration support.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Box, Text } from '@primer/react';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LoroCollaborativePlugin } from '@datalayer/lexical-loro';
import {
  JupyterCellPlugin,
  JupyterInputOutputPlugin,
} from '@datalayer/jupyter-lexical/lib/plugins';
import { useJupyter } from '@datalayer/jupyter-react';
import { useCoreStore } from '@datalayer/core/state';
import { CustomLexicalEditorProps } from '../../../shared/types';
import { buildCollaborationWebSocketUrl } from '../../utils/document';
import { logger } from '../../utils/logger';
import EditorInitPlugin from './EditorInitPlugin';
import type { LexicalEditor as LexicalEditorType } from 'lexical';

/**
 * Lexical-based rich text editor component with Jupyter and collaboration features.
 * Supports code execution, real-time collaboration, and document editing.
 * @component
 * @param props - Component props
 * @param props.selectedDocument - The document being edited
 * @param props.collaborationEnabled - Whether collaboration is enabled
 * @param props.onCollaborationStatusChange - Callback for collaboration status changes
 * @param props.onEditorInit - Callback when editor is initialized
 * @param props.serviceManager - Jupyter service manager for code execution
 * @returns Rendered Lexical editor with plugins
 */
const LexicalEditor: React.FC<CustomLexicalEditorProps> = ({
  selectedDocument,
  collaborationEnabled,
  onCollaborationStatusChange,
  onEditorInit,
  serviceManager,
}) => {
  const { configuration } = useCoreStore();
  const { defaultKernel } = useJupyter();

  // Debug kernel availability
  logger.debug('CustomLexicalEditor kernel state:', {
    hasServiceManager: !!serviceManager,
    hasDefaultKernel: !!defaultKernel,
    kernelReady: defaultKernel?.ready,
    kernelId: defaultKernel?.id,
  });

  const [editorRef, setEditorRef] = useState<LexicalEditorType | null>(null);
  const [lastConnectedTime, setLastConnectedTime] = useState<number>(0);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Placeholder component
  const Placeholder = () => (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        color: '#999',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      Start writing your document...
    </div>
  );

  // Initialize editor and call onEditorInit when editor is ready
  const handleEditorRef = useCallback(
    (editor: LexicalEditorType | null) => {
      if (editor && editor !== editorRef) {
        setEditorRef(editor);
        onEditorInit(editor);
      }
    },
    [onEditorInit, editorRef]
  );

  // Debounced collaboration status to prevent excessive re-renders
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      logger.debug('Loro collaboration connection changed:', connected);

      if (connected) {
        // Immediately show connected state
        setLastConnectedTime(Date.now());
        onCollaborationStatusChange('connected');

        // Clear any pending disconnect timeout
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }
      } else {
        // Don't immediately show disconnected - wait to see if it reconnects quickly
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
        }

        disconnectTimeoutRef.current = setTimeout(() => {
          // Only show disconnected if we've been disconnected for 3+ seconds
          const timeSinceLastConnected = Date.now() - lastConnectedTime;
          if (timeSinceLastConnected > 3000) {
            onCollaborationStatusChange('disconnected');
          }
          disconnectTimeoutRef.current = null;
        }, 3000);
      }
    },
    [lastConnectedTime, onCollaborationStatusChange]
  );

  const handlePeerIdChange = useCallback((peerId: string) => {
    logger.debug('Loro collaboration peer ID changed:', peerId);
  }, []);

  const handleAwarenessChange = useCallback((awarenessData: any) => {
    logger.debug('Loro collaboration awareness changed:', awarenessData);

    // Enhanced stale peer cleanup
    if (awarenessData && awarenessData.states) {
      const currentTime = Date.now();
      const staleThreshold = 30000; // 30 seconds
      const stalePeers: string[] = [];

      // Check for stale peers
      Object.entries(awarenessData.states).forEach(
        ([peerId, state]: [string, any]) => {
          if (state && state.lastSeen && typeof state.lastSeen === 'number') {
            const timeSinceLastSeen = currentTime - state.lastSeen;
            if (timeSinceLastSeen > staleThreshold) {
              stalePeers.push(peerId);
              logger.debug(
                `[Awareness Cleanup] Peer ${peerId} is stale (last seen: ${timeSinceLastSeen}ms ago)`
              );
            }
          }
        }
      );

      // Log peer count for debugging
      const activePeerCount =
        Object.keys(awarenessData.states).length - stalePeers.length;
      const totalPeers = Object.keys(awarenessData.states).length;
      logger.debug(
        `[Awareness State] Active peers: ${activePeerCount}, Total peers: ${totalPeers}, Stale peers: ${stalePeers.length}`
      );

      // Force cleanup of stale peers if we have more than 2 total peers
      if (stalePeers.length > 0 && totalPeers > 2) {
        logger.warn(
          `[Awareness Cleanup] Found ${stalePeers.length} stale peers, attempting manual cleanup`
        );
        stalePeers.forEach(peerId => {
          logger.debug(
            `[Awareness Cleanup] Requesting removal of stale peer: ${peerId}`
          );
          // The plugin should handle this internally, but we're logging for debugging
        });
      }
    }
  }, []);

  const handleCollaborationInit = useCallback(
    (success: boolean) => {
      logger.debug('Loro collaboration initialization:', {
        success,
        documentId: selectedDocument.id,
      });
      if (!success) {
        onCollaborationStatusChange('error');
      }
      // Don't set connected here - let handleConnectionChange handle it
    },
    [selectedDocument.id, onCollaborationStatusChange]
  );

  // Store disconnect function for cleanup
  const [collaborationDisconnectFn, setCollaborationDisconnectFn] = useState<
    (() => void) | null
  >(null);

  const handleDisconnectReady = useCallback((disconnectFn: () => void) => {
    setCollaborationDisconnectFn(() => disconnectFn);
    logger.debug('Loro disconnect function ready and stored');
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSendMessageReady = useCallback(
    (sendMessageFn: (message: any) => void) => {
      // Store sendMessage function for potential future use
      logger.debug('Loro send message function ready:', typeof sendMessageFn);
    },
    []
  );

  // Cleanup stale connections when component unmounts or document changes
  useEffect(() => {
    return () => {
      // Cleanup function when component unmounts or dependencies change
      if (collaborationDisconnectFn) {
        logger.debug(
          '[Peer Cleanup] Disconnecting collaboration on component cleanup'
        );
        try {
          collaborationDisconnectFn();
        } catch (error) {
          logger.warn(
            '[Peer Cleanup] Error during collaboration disconnect:',
            error
          );
        }
      }

      // Clear stored functions
      setCollaborationDisconnectFn(null);

      logger.debug(
        '[Peer Cleanup] Collaboration cleanup completed for document:',
        selectedDocument.id
      );
    };
  }, [selectedDocument.id, collaborationDisconnectFn]); // Re-run cleanup when document or disconnect function changes

  // Build WebSocket URL for collaboration with authentication
  const collaborationWebSocketUrl = useMemo(() => {
    return buildCollaborationWebSocketUrl(
      configuration?.spacerRunUrl,
      configuration?.token,
      selectedDocument.id
    );
  }, [configuration?.spacerRunUrl, configuration?.token, selectedDocument.id]);

  return (
    <Box
      sx={{
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          m: 2,
        }}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              style={{
                minHeight: '200px',
                padding: '16px',
                outline: 'none',
                resize: 'none',
                fontSize: '14px',
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: '1.5',
                position: 'relative',
              }}
              spellCheck={true}
            />
          }
          placeholder={<Placeholder />}
          ErrorBoundary={LexicalErrorBoundary}
        />

        {/* History Plugin for undo/redo */}
        <HistoryPlugin />

        {/* Jupyter Plugins - re-enabled */}
        {serviceManager && defaultKernel && (
          <>
            <JupyterCellPlugin />
            <JupyterInputOutputPlugin kernel={defaultKernel as any} />
          </>
        )}

        {/* Loro Collaborative Plugin - re-enabled with enhanced cleanup */}
        {collaborationEnabled && collaborationWebSocketUrl && editorRef && (
          <LoroCollaborativePlugin
            docId={selectedDocument.id}
            websocketUrl={collaborationWebSocketUrl}
            onConnectionChange={handleConnectionChange}
            onPeerIdChange={handlePeerIdChange}
            onAwarenessChange={handleAwarenessChange}
            onInitialization={handleCollaborationInit}
            onDisconnectReady={handleDisconnectReady}
            onSendMessageReady={handleSendMessageReady}
          />
        )}

        {/* Editor initialization */}
        <EditorInitPlugin onEditorInit={handleEditorRef} />
      </Box>

      {/* Editor Status Bar */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'border.default',
          p: 2,
          fontSize: 1,
          color: 'fg.muted',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text>Ready to edit • Press Ctrl+Z to undo • Press Ctrl+Y to redo</Text>
        {serviceManager && (
          <Text sx={{ color: 'success.fg' }}>✓ Jupyter kernel ready</Text>
        )}
      </Box>
    </Box>
  );
};

export default LexicalEditor;
