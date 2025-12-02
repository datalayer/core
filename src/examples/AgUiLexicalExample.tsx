/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * AG-UI Lexical Example with CopilotKit Integration
 *
 * To run this example, create a .env file in the core directory with:
 * - VITE_DATALAYER_API_TOKEN: Get from https://datalayer.app/settings/iam/tokens
 * - VITE_COPILOT_KIT_API_KEY: Get from https://cloud.copilotkit.ai/dashboard
 *
 * You also will need to connect copilot kit to some sort of LLM Add LLM Provider API Key
 *
 * https://docs.copilotkit.ai/reference/hooks/useFrontendTool
 *
 * @module datalayer-core/AgUiLexicalExample
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@datalayer/primer-addons';
import { $getRoot, $createParagraphNode, EditorState } from 'lexical';

import 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-objectivec';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-swift';

// Import Lexical theme styles
import './lexical-theme.css';
import '@datalayer/jupyter-lexical/style/index.css';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import {
  CodeNode,
  CodeHighlightNode,
  registerCodeHighlighting,
} from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { HashtagNode } from '@lexical/hashtag';
import { MarkNode } from '@lexical/mark';
import { OverflowNode } from '@lexical/overflow';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { Jupyter, useJupyter } from '@datalayer/jupyter-react';
import type { ServiceManager } from '@jupyterlab/services';

// Jupyter Lexical components and plugins
import {
  JupyterInputNode,
  JupyterInputHighlightNode,
  JupyterOutputNode,
  JupyterCellNode,
  InlineCompletionNode,
  ComponentPickerMenuPlugin,
  JupyterCellPlugin,
  JupyterInputOutputPlugin,
  DraggableBlockPlugin,
  EquationNode,
  ImageNode,
  YouTubeNode,
  ImagesPlugin,
  HorizontalRulePlugin,
  EquationsPlugin,
  YouTubePlugin,
  AutoLinkPlugin,
  AutoEmbedPlugin,
  LexicalConfigProvider,
  LexicalStatePlugin,
  FloatingTextFormatToolbarPlugin,
  CodeActionMenuPlugin,
  ListMaxIndentLevelPlugin,
} from '@datalayer/jupyter-lexical';

// CopilotKit imports
import { CopilotKit, useFrontendTool } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

// Import AG-UI hooks and components
import {
  ActionRegistrar,
  useLexicalToolActions,
} from '../tools/adapters/agui/lexicalHooks';

// Fixed lexical document ID
const LEXICAL_ID = 'agui-lexical-example';

// Import sample lexical document
// import contentLexical from './lexicals/vscode.lexical';

// Convert to string for LoadContentPlugin
// const INITIAL_CONTENT = JSON.stringify(contentLexical);
const INITIAL_CONTENT = undefined; // Use default empty document

/**
 * Lexical plugin for loading initial content into the editor.
 */
function LoadContentPlugin({ content }: { content?: string }) {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!content || !isFirstRender.current) {
      return;
    }

    isFirstRender.current = false;
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.root) {
        const editorState = editor.parseEditorState(content);
        editor.setEditorState(editorState, {
          tag: 'history-merge',
        });
      } else {
        throw new Error('Invalid Lexical editor state format');
      }
    } catch {
      editor.update(
        () => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        },
        {
          tag: 'history-merge',
        },
      );
    }
  }, [content, editor]);

  return null;
}

/**
 * Lexical plugin for Jupyter code syntax highlighting.
 */
function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);

  return null;
}

/**
 * Wrapper component for kernel-dependent Jupyter plugins.
 */
function JupyterKernelPluginsInner() {
  const { defaultKernel } = useJupyter();

  return (
    <>
      <ComponentPickerMenuPlugin kernel={defaultKernel} />
      <JupyterInputOutputPlugin kernel={defaultKernel} />
    </>
  );
}

/**
 * Lexical UI component with full LexicalComposer setup
 */
interface LexicalUIProps {
  content?: string;
  serviceManager?: any;
}

const LexicalUI = React.memo(function LexicalUI({
  content = INITIAL_CONTENT,
  serviceManager,
}: LexicalUIProps): JSX.Element {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  // Lexical theme configuration
  const theme = {
    // Text formatting
    text: {
      bold: 'lexical-theme-bold',
      italic: 'lexical-theme-italic',
      underline: 'lexical-theme-underline',
      strikethrough: 'lexical-theme-strikethrough',
      code: 'lexical-theme-code',
      subscript: 'lexical-theme-subscript',
      superscript: 'lexical-theme-superscript',
    },
    // Block elements
    paragraph: 'lexical-theme-paragraph',
    quote: 'lexical-theme-quote',
    heading: {
      h1: 'lexical-theme-heading-h1',
      h2: 'lexical-theme-heading-h2',
      h3: 'lexical-theme-heading-h3',
      h4: 'lexical-theme-heading-h4',
      h5: 'lexical-theme-heading-h5',
      h6: 'lexical-theme-heading-h6',
    },
    // Lists
    list: {
      ul: 'lexical-theme-list-ul',
      ol: 'lexical-theme-list-ol',
      listitem: 'lexical-theme-list-listitem',
      nested: {
        listitem: 'lexical-theme-list-nested-listitem',
      },
      checklist: 'lexical-theme-list-checklist',
      listitemChecked: 'lexical-theme-list-listitemChecked',
      listitemUnchecked: 'lexical-theme-list-listitemUnchecked',
    },
    // Code blocks
    code: 'lexical-theme-code-block',
    codeHighlight: {
      comment: 'lexical-theme-code-tokenComment',
      punctuation: 'lexical-theme-code-tokenPunctuation',
      property: 'lexical-theme-code-tokenProperty',
      selector: 'lexical-theme-code-tokenSelector',
      operator: 'lexical-theme-code-tokenOperator',
      attr: 'lexical-theme-code-tokenAttr',
      variable: 'lexical-theme-code-tokenVariable',
      function: 'lexical-theme-code-tokenFunction',
      keyword: 'lexical-theme-code-tokenKeyword',
      string: 'lexical-theme-code-tokenString',
      number: 'lexical-theme-code-tokenNumber',
      boolean: 'lexical-theme-code-tokenBoolean',
      regex: 'lexical-theme-code-tokenRegex',
    },
    // Links
    link: 'lexical-theme-link',
    autolink: 'lexical-theme-autolink',
    // Tables
    table: 'lexical-theme-table',
    tableCell: 'lexical-theme-tableCell',
    tableCellHeader: 'lexical-theme-tableCellHeader',
    // Special nodes
    hashtag: 'lexical-theme-hashtag',
    image: 'lexical-theme-image',
    hr: 'lexical-theme-hr',
    mark: 'lexical-theme-mark',
  };

  const editorConfig = {
    namespace: 'AgUiLexicalEditor',
    editable: true,
    theme,
    nodes: [
      // Basic rich text nodes
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
      AutoLinkNode,
      // Table nodes
      TableNode,
      TableCellNode,
      TableRowNode,
      // Additional nodes from @lexical packages
      HashtagNode,
      MarkNode,
      OverflowNode,
      HorizontalRuleNode,
      // Jupyter lexical nodes
      EquationNode,
      ImageNode,
      YouTubeNode,
      JupyterCellNode,
      JupyterInputNode,
      JupyterInputHighlightNode,
      JupyterOutputNode,
      InlineCompletionNode,
    ],
    onError(_error: Error) {
      // Lexical error handler
    },
  };

  const handleChange = useCallback((_editorState: EditorState) => {
    // onChange handler - can be used for tracking changes
  }, []);

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: 3,
        }}
      >
        <Box
          sx={{
            marginBottom: 3,
            paddingBottom: 3,
            borderBottom: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <h1>AG-UI Lexical Example</h1>
          <p>
            Platform-agnostic tool usage with CopilotKit integration. Use the AI
            copilot to manipulate the document.
          </p>
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            padding: 3,
            backgroundColor: 'canvas.default',
            minHeight: '600px',
          }}
        >
          <LexicalConfigProvider
            lexicalId={LEXICAL_ID}
            serviceManager={serviceManager}
          >
            <LexicalComposer initialConfig={editorConfig}>
              <div className="lexical-editor-inner" ref={onRef}>
                {/* CRITICAL: LexicalStatePlugin registers the adapter in the store */}
                <LexicalStatePlugin />
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable
                      className="lexical-editor-content"
                      aria-label="Lexical Editor"
                    />
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <OnChangePlugin onChange={handleChange} />
                <HistoryPlugin />
                <AutoFocusPlugin />
                <ListPlugin />
                <CheckListPlugin />
                <LinkPlugin />
                <AutoLinkPlugin />
                <ListMaxIndentLevelPlugin maxDepth={7} />
                <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                <LoadContentPlugin content={content} />
                <CodeHighlightPlugin />
                <ImagesPlugin captionsEnabled={false} />
                <HorizontalRulePlugin />
                <EquationsPlugin />
                <YouTubePlugin />
                <AutoEmbedPlugin />
                <JupyterCellPlugin />
                {/* Wrap kernel plugins with Jupyter provider */}
                <Jupyter
                  serviceManager={serviceManager}
                  startDefaultKernel={true}
                  defaultKernelName="python"
                  lite={false}
                  collaborative={false}
                  terminals={false}
                >
                  <JupyterKernelPluginsInner />
                </Jupyter>
                {floatingAnchorElem && (
                  <>
                    <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                    <FloatingTextFormatToolbarPlugin
                      anchorElem={floatingAnchorElem}
                    />
                    <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
                  </>
                )}
              </div>
            </LexicalComposer>
          </LexicalConfigProvider>
        </Box>
      </Box>
    </Box>
  );
});

/**
 * Component that renders the Lexical UI with CopilotKit tool registration.
 * MUST be inside CopilotKit context for tool registration to work.
 */
interface LexicalWithToolsProps {
  content?: string;
  serviceManager?: ServiceManager.IManager;
}

function LexicalWithTools({
  content,
  serviceManager,
}: LexicalWithToolsProps): JSX.Element {
  // Get all actions for this lexical document
  const actions = useLexicalToolActions(LEXICAL_ID);

  return (
    <>
      {/* Register each action using a loop with ActionRegistrar component */}
      {actions.map((action, i) => (
        <ActionRegistrar
          key={action.name || i}
          action={action}
          useFrontendTool={useFrontendTool}
        />
      ))}
      <LexicalUI content={content} serviceManager={serviceManager} />
    </>
  );
}

/**
 * Main AG-UI lexical example component
 */
interface AgUiLexicalExampleProps {
  content?: string;
  serviceManager?: ServiceManager.IManager;
}

function AgUiLexicalExample({
  content,
  serviceManager,
}: AgUiLexicalExampleProps): JSX.Element {
  return (
    <CopilotKit
      showDevConsole={true}
      publicApiKey={import.meta.env.VITE_COPILOT_KIT_API_KEY}
    >
      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: 'Lexical AI Copilot',
          initial:
            'Hi! I can help you edit lexical documents. Try: "Insert a heading", "Add a code block", or "Create a list"',
        }}
      >
        <LexicalWithTools content={content} serviceManager={serviceManager} />
      </CopilotSidebar>
    </CopilotKit>
  );
}

export default AgUiLexicalExample;
