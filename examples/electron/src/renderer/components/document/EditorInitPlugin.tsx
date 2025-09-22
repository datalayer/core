/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/components/document/EditorInitPlugin
 * @description Lexical editor initialization plugin for document editing.
 */

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { EditorInitPluginProps } from '../../../shared/types';

/**
 * Plugin component that provides access to the Lexical editor instance on initialization.
 * Calls the onEditorInit callback when the editor is ready.
 * @component
 * @param props - Component props
 * @param props.onEditorInit - Callback function called with the editor instance
 * @returns null (invisible plugin component)
 */
const EditorInitPlugin: React.FC<EditorInitPluginProps> = ({
  onEditorInit,
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onEditorInit(editor);
  }, [editor, onEditorInit]);

  return null;
};

export default EditorInitPlugin;
