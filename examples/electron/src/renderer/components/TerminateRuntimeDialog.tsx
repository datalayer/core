/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module TerminateRuntimeDialog
 * @description Modal dialog component for confirming runtime termination with keyboard shortcuts and error handling
 */

import React, { useEffect } from 'react';
import { Box, Text, Button, Dialog } from '@primer/react';
import { XIcon, AlertIcon } from '@primer/octicons-react';

/**
 * Props for the TerminateRuntimeDialog component
 * @interface
 */
export interface TerminateRuntimeDialogProps {
  isOpen: boolean;
  isTerminating: boolean;
  itemName: string;
  itemType?: 'notebook' | 'document';
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal dialog that prompts users to confirm runtime termination for notebooks or documents.
 * Features keyboard shortcuts (Ctrl+Enter to confirm, Esc to cancel), error display, and loading states.
 *
 * @component
 * @param props - Component properties
 * @param props.isOpen - Whether the dialog is currently open
 * @param props.isTerminating - Whether termination is in progress
 * @param props.itemName - Name of the item whose runtime is being terminated
 * @param props.itemType - Type of item ('notebook' or 'document')
 * @param props.error - Error message to display if termination failed
 * @param props.onConfirm - Callback function when user confirms termination
 * @param props.onCancel - Callback function when user cancels termination
 * @returns The rendered dialog component or null if not open
 */
const TerminateRuntimeDialog: React.FC<TerminateRuntimeDialogProps> = ({
  isOpen,
  isTerminating,
  itemName,
  itemType = 'notebook',
  error,
  onConfirm,
  onCancel,
}) => {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape' && !isTerminating) {
        event.preventDefault();
        onCancel();
      } else if (event.key === 'Enter' && event.ctrlKey && !isTerminating) {
        event.preventDefault();
        onConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
    return undefined;
  }, [isOpen, isTerminating, onCancel, onConfirm]);

  if (!isOpen) {
    return null;
  }

  const itemTypeLabel = itemType === 'document' ? 'document' : 'notebook';

  return (
    <Dialog
      isOpen={isOpen}
      onDismiss={() => {
        if (!isTerminating) {
          onCancel();
        }
      }}
      aria-labelledby="terminate-runtime-title"
      aria-describedby="terminate-runtime-description"
      role="alertdialog"
      sx={{
        '& [data-overlay]': {
          bg: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <Dialog.Header
        id="terminate-runtime-title"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'border.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AlertIcon size={20} aria-hidden="true" />
          Terminate Runtime
        </Box>
      </Dialog.Header>

      <Box sx={{ p: 4 }}>
        <Text
          id="terminate-runtime-description"
          sx={{
            mb: error ? 3 : 4,
            display: 'block',
            fontSize: 2,
            lineHeight: 1.4,
            color: 'danger.fg',
          }}
          role="alert"
          aria-live="polite"
        >
          Are you sure you want to terminate the runtime for{' '}
          <Text
            as="span"
            sx={{
              fontWeight: 'bold',
              fontFamily: 'mono',
            }}
          >
            "{itemName || `this ${itemTypeLabel}`}"
          </Text>
          ?
        </Text>

        {error && (
          <Box
            sx={{
              bg: 'danger.subtle',
              border: '1px solid',
              borderColor: 'danger.muted',
              borderRadius: 2,
              p: 3,
              mb: 4,
            }}
            role="alert"
            aria-live="assertive"
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ color: 'danger.fg', mt: 0.5, flexShrink: 0 }}>
                <AlertIcon size={16} aria-hidden="true" />
              </Box>
              <Box>
                <Text
                  sx={{
                    color: 'danger.fg',
                    fontWeight: 'semibold',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  Error occurred
                </Text>
                <Text sx={{ color: 'danger.fg', fontSize: 1 }}>{error}</Text>
              </Box>
            </Box>
          </Box>
        )}

        <Text sx={{ color: 'fg.muted', fontSize: 1, fontStyle: 'italic' }}>
          Tip: Press <kbd>Ctrl+Enter</kbd> to confirm or <kbd>Esc</kbd> to
          cancel
        </Text>
      </Box>

      <Box
        sx={{
          p: 3,
          borderTop: '1px solid',
          borderColor: 'border.default',
          bg: 'canvas.subtle',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="default"
            onClick={onCancel}
            disabled={isTerminating}
            aria-label="Cancel runtime termination and close dialog"
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'accent.fg',
                outlineOffset: '2px',
              },
              '&:disabled': {
                opacity: 0.6,
                cursor: 'not-allowed',
              },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isTerminating}
            leadingVisual={XIcon}
            aria-label={`Confirm termination of runtime for ${itemName || `this ${itemTypeLabel}`}`}
            sx={{
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'white',
                outlineOffset: '-2px',
              },
              '&:disabled': {
                opacity: 0.8,
                cursor: 'not-allowed',
              },
            }}
          >
            {isTerminating ? (
              <Box
                as="span"
                sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              >
                <Box
                  sx={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid',
                    borderColor: 'transparent',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                  aria-hidden="true"
                />
                Terminating...
                <Box
                  as="span"
                  sx={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: '0',
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: '0',
                  }}
                >
                  Terminating runtime, please wait
                </Box>
              </Box>
            ) : (
              <>
                Terminate Runtime
                <Box
                  as="span"
                  sx={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: '0',
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: '0',
                  }}
                >
                  Press Ctrl+Enter to terminate
                </Box>
              </>
            )}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default TerminateRuntimeDialog;
