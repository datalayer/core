/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { EditorInitPluginProps } from '../../../shared/types';

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
