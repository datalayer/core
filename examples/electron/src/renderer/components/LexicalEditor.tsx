/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import './LexicalEditor.css';
import { Box, Text, Button, ActionMenu, ActionList } from '@primer/react';
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListUnorderedIcon,
  ListOrderedIcon,
  QuoteIcon,
} from '@primer/octicons-react';

import { $getSelection, $isRangeSelection } from 'lexical';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createListItemNode, $createListNode } from '@lexical/list';
import { $createLinkNode } from '@lexical/link';
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from '@lexical/selection';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';

import { COLORS } from '../constants/colors';

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
  },
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    overflowed: 'editor-text-overflowed',
    hashtag: 'editor-text-hashtag',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};

function onError(error: Error) {
  console.error(error);
}

const initialConfig = {
  namespace: 'DatalayerLexicalEditor',
  theme,
  onError,
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    LinkNode,
    AutoLinkNode,
  ],
};

interface ToolbarPluginProps {
  activeFormats: Set<string>;
  onFormatText: (format: string) => void;
  onInsertLink: () => void;
  onInsertList: (type: 'ul' | 'ol') => void;
  onInsertQuote: () => void;
  onInsertHeading: (level: 1 | 2 | 3) => void;
}

function ToolbarPlugin({
  activeFormats,
  onFormatText,
  onInsertLink,
  onInsertList,
  onInsertQuote,
  onInsertHeading,
}: ToolbarPluginProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'border.default',
        bg: 'canvas.subtle',
      }}
    >
      {/* Text Formatting */}
      <Button
        variant={activeFormats.has('bold') ? 'primary' : 'default'}
        size="small"
        onClick={() => onFormatText('bold')}
        sx={{ minWidth: 32 }}
      >
        <BoldIcon size={16} />
      </Button>
      <Button
        variant={activeFormats.has('italic') ? 'primary' : 'default'}
        size="small"
        onClick={() => onFormatText('italic')}
        sx={{ minWidth: 32 }}
      >
        <ItalicIcon size={16} />
      </Button>
      <Button
        variant={activeFormats.has('underline') ? 'primary' : 'default'}
        size="small"
        onClick={() => onFormatText('underline')}
        sx={{ minWidth: 32 }}
      >
        <Text sx={{ fontSize: 0, fontWeight: 'bold' }}>U</Text>
      </Button>

      {/* Separator */}
      <Box sx={{ width: '1px', height: 24, bg: 'border.default', mx: 1 }} />

      {/* Lists */}
      <Button
        variant="default"
        size="small"
        onClick={() => onInsertList('ul')}
        sx={{ minWidth: 32 }}
      >
        <ListUnorderedIcon size={16} />
      </Button>
      <Button
        variant="default"
        size="small"
        onClick={() => onInsertList('ol')}
        sx={{ minWidth: 32 }}
      >
        <ListOrderedIcon size={16} />
      </Button>

      {/* Separator */}
      <Box sx={{ width: '1px', height: 24, bg: 'border.default', mx: 1 }} />

      {/* Quote */}
      <Button
        variant="default"
        size="small"
        onClick={onInsertQuote}
        sx={{ minWidth: 32 }}
      >
        <QuoteIcon size={16} />
      </Button>

      {/* Headings */}
      <ActionMenu>
        <ActionMenu.Anchor>
          <Button variant="default" size="small" sx={{ minWidth: 'auto' }}>
            <Text sx={{ fontSize: 0, fontWeight: 'bold' }}>H</Text>
          </Button>
        </ActionMenu.Anchor>
        <ActionMenu.Overlay>
          <ActionList>
            <ActionList.Item onSelect={() => onInsertHeading(1)}>
              <Text sx={{ fontSize: 2, fontWeight: 'bold' }}>Heading 1</Text>
            </ActionList.Item>
            <ActionList.Item onSelect={() => onInsertHeading(2)}>
              <Text sx={{ fontSize: 1, fontWeight: 'bold' }}>Heading 2</Text>
            </ActionList.Item>
            <ActionList.Item onSelect={() => onInsertHeading(3)}>
              <Text sx={{ fontSize: 0, fontWeight: 'bold' }}>Heading 3</Text>
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>

      {/* Separator */}
      <Box sx={{ width: '1px', height: 24, bg: 'border.default', mx: 1 }} />

      {/* Link */}
      <Button
        variant="default"
        size="small"
        onClick={onInsertLink}
        sx={{ minWidth: 32 }}
      >
        <LinkIcon size={16} />
      </Button>
    </Box>
  );
}

function EditorToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!selection || !$isRangeSelection(selection)) return;

    const formats = new Set<string>();

    // Check for text formatting
    if (
      $getSelectionStyleValueForProperty(selection, 'font-weight') === '700'
    ) {
      formats.add('bold');
    }
    if (
      $getSelectionStyleValueForProperty(selection, 'font-style') === 'italic'
    ) {
      formats.add('italic');
    }
    if (
      $getSelectionStyleValueForProperty(selection, 'text-decoration-line') ===
      'underline'
    ) {
      formats.add('underline');
    }

    setActiveFormats(formats);
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatText = useCallback(
    (format: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection) {
          if (format === 'bold') {
            $patchStyleText(selection, {
              'font-weight': activeFormats.has('bold') ? 'normal' : 'bold',
            });
          } else if (format === 'italic') {
            $patchStyleText(selection, {
              'font-style': activeFormats.has('italic') ? 'normal' : 'italic',
            });
          } else if (format === 'underline') {
            $patchStyleText(selection, {
              'text-decoration-line': activeFormats.has('underline')
                ? 'none'
                : 'underline',
            });
          }
        }
      });
    },
    [editor, activeFormats]
  );

  const insertLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.update(() => {
        const selection = $getSelection();
        if (selection) {
          const linkNode = $createLinkNode(url);
          selection.insertNodes([linkNode]);
        }
      });
    }
  }, [editor]);

  const insertList = useCallback(
    (type: 'ul' | 'ol') => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection) {
          const listNode = $createListNode(type === 'ul' ? 'bullet' : 'number');
          const listItemNode = $createListItemNode();
          listNode.append(listItemNode);
          selection.insertNodes([listNode]);
        }
      });
    },
    [editor]
  );

  const insertQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        const quoteNode = $createQuoteNode();
        selection.insertNodes([quoteNode]);
      }
    });
  }, [editor]);

  const insertHeading = useCallback(
    (level: 1 | 2 | 3) => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection) {
          const headingNode = $createHeadingNode(
            `h${level}` as 'h1' | 'h2' | 'h3'
          );
          selection.insertNodes([headingNode]);
        }
      });
    },
    [editor]
  );

  return (
    <ToolbarPlugin
      activeFormats={activeFormats}
      onFormatText={formatText}
      onInsertLink={insertLink}
      onInsertList={insertList}
      onInsertQuote={insertQuote}
      onInsertHeading={insertHeading}
    />
  );
}

const LexicalEditor: React.FC = () => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3 }}>
        <Text
          sx={{ fontSize: 3, fontWeight: 'bold', color: COLORS.brand.primary }}
        >
          Rich Text Editor&nbsp;
        </Text>
        <Text sx={{ fontSize: 1, color: 'fg.muted', mt: 2 }}>
          Create and edit rich text content with formatting, lists, links, and
          more.
        </Text>
      </Box>

      <Box
        sx={{
          flex: 1,
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <LexicalComposer initialConfig={initialConfig}>
          <EditorToolbarPlugin />
          <Box sx={{ flex: 1, position: 'relative', overflow: 'auto' }}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  style={{
                    minHeight: '400px',
                    padding: '24px',
                    outline: 'none',
                    resize: 'none',
                    fontSize: '15px',
                    lineHeight: '1.7',
                    fontFamily: 'inherit',
                    background: 'transparent',
                  }}
                />
              }
              placeholder={
                <Box
                  sx={{
                    position: 'absolute',
                    top: 24,
                    left: 24,
                    color: 'fg.muted',
                    fontSize: 1,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  Start writing...
                </Box>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <LinkPlugin />
            <ListPlugin />
            <TabIndentationPlugin />
          </Box>
        </LexicalComposer>
      </Box>
    </Box>
  );
};

export default LexicalEditor;
