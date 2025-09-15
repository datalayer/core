/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module DeleteConfirmationDialog
 * @description Accessible confirmation dialog for deleting library items.
 * Requires users to type the item name to confirm deletion, preventing accidental deletions.
 * Includes loading states, error handling, and comprehensive accessibility features.
 */

import React from 'react';
import {
  Box,
  Text,
  Dialog,
  Button,
  FormControl,
  TextInput,
  Flash,
  Spinner,
} from '@primer/react';
import { AlertIcon } from '@primer/octicons-react';
import { COLORS } from '../../../shared/constants/colors';
import { DeleteConfirmationDialogProps } from '../../../shared/types';

/**
 * @component DeleteConfirmationDialog
 * @description A modal dialog that confirms deletion of library items with typed confirmation
 * @param {DeleteConfirmationDialogProps} props - The component props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Object} props.item - The item to be deleted (must have a name property)
 * @param {string} props.confirmationText - Current text in the confirmation input
 * @param {boolean} props.isDeleting - Whether deletion is in progress
 * @param {string | null} props.error - Error message to display
 * @param {function} props.onConfirmationTextChange - Handler for confirmation text changes
 * @param {function} props.onConfirm - Handler for confirming deletion
 * @param {function} props.onCancel - Handler for canceling deletion
 * @returns {JSX.Element | null} The rendered dialog component or null if not open
 */
const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  item,
  confirmationText,
  isDeleting,
  error,
  onConfirmationTextChange,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !item) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onDismiss={() => {
        if (!isDeleting) {
          onCancel();
        }
      }}
      aria-labelledby="delete-item-title"
      aria-describedby="delete-item-description"
      role="alertdialog"
    >
      <Dialog.Header id="delete-item-title">Delete Item</Dialog.Header>

      <Box sx={{ p: 4 }}>
        <Text
          id="delete-item-description"
          sx={{ mb: 4, color: 'danger.fg', display: 'block' }}
          role="alert"
          aria-live="polite"
        >
          <Box sx={{ mr: 2, display: 'inline-block' }} aria-hidden="true">
            <AlertIcon />
          </Box>
          This action cannot be undone. This will permanently delete{' '}
          <strong>"{item.name}"</strong>.
        </Text>

        <FormControl sx={{ width: '100%' }} disabled={isDeleting}>
          <FormControl.Label sx={{ mb: 2, display: 'block' }}>
            Please type <strong>{item.name}</strong> to confirm:
          </FormControl.Label>
          <TextInput
            value={confirmationText}
            onChange={e => onConfirmationTextChange(e.target.value)}
            placeholder="Type item name here"
            autoFocus
            sx={{ width: '100%' }}
            aria-label={`Type "${item.name}" to confirm deletion`}
            aria-describedby="delete-confirmation-help"
          />
          <div
            id="delete-confirmation-help"
            style={{
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
            Type the exact item name to enable the delete button
          </div>
        </FormControl>

        {error && (
          <Flash
            variant="danger"
            sx={{ mt: 3 }}
            role="alert"
            aria-live="assertive"
          >
            {error}
          </Flash>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          p: 3,
          borderTop: '1px solid',
          borderColor: 'border.default',
        }}
      >
        <Button
          variant="invisible"
          onClick={onCancel}
          disabled={isDeleting}
          aria-label="Cancel deletion and close dialog"
          sx={{
            color: 'fg.default',
            '&:hover': {
              color: 'fg.default',
            },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: COLORS.brand.primary,
              outlineOffset: '2px',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting || confirmationText !== item.name}
          aria-label={
            confirmationText !== item.name
              ? `Type "${item.name}" to enable deletion`
              : `Permanently delete "${item.name}"`
          }
          sx={{
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'white',
              outlineOffset: '-2px',
            },
          }}
        >
          {isDeleting ? (
            <>
              <Spinner size="small" sx={{ mr: 1 }} />
              Deleting...
            </>
          ) : (
            'Delete Item'
          )}
        </Button>
      </Box>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
