/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import type { IMarkdownParser, IRenderMime } from '@jupyterlab/rendermime';
import { useEffect, useState } from 'react';

/**
 * {@link Markdown} properties
 */
export interface IMarkdownProps {
  /**
   * Text to render
   */
  text: string;

  /**
   * Markdown parser
   */
  markdownParser: IMarkdownParser;

  /**
   * HTML sanitizer; if not provided the produced HTML
   * will not be sanitized.
   */
  sanitizer?: IRenderMime.ISanitizer;
}

/**
 * Rendered text as Markdown
 */
export function Markdown(props: IMarkdownProps): JSX.Element {
  const { markdownParser, sanitizer, text } = props;
  const [renderedText, setRenderedText] = useState('');
  useEffect(() => {
    markdownParser.render(text).then(r => {
      if (sanitizer) {
        setRenderedText(sanitizer.sanitize(r));
      } else {
        setRenderedText(r);
      }
    });
  }, [markdownParser, sanitizer, text]);
  return <div dangerouslySetInnerHTML={{ __html: renderedText }} />;
}
