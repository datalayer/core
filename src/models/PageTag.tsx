/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { CardIconColors } from '@primer/react-brand';
import { Icon, CopilotIcon, ZapIcon } from '@primer/octicons-react';

type CardIconColorsType = typeof CardIconColors[number];

export type PageTagMetadata = { 
  fillColor: React.CSSProperties['backgroundColor']
}

export type PageTagName =
  'ai' |
  'deep-learning' |
  'example' |
  'llm' |
  'python' |
  'pytorch' |
  'spatial' |
  'tutorial'
  ;

export type PageTag = { 
  id: string;
  text?: PageTagName;
  color: CardIconColorsType;
  Icon: Icon;
  metadata?: PageTagMetadata;
}

export const PAGE_TAGE_NONE: PageTag = { id: '0', text: undefined, Icon: CopilotIcon, color:'pink' };
const PAGE_TAGE_AI: PageTag = { id: '1', text: 'ai', Icon: CopilotIcon, color:'pink' };
const PAGE_TAGE_DEEP_LEARNING: PageTag = { id: '2', text: 'deep-learning', Icon: ZapIcon, color:'blue'  };
const PAGE_TAGE_EXAMPLE: PageTag = { id: '3', text: 'example', Icon: CopilotIcon, color:'lime'  };
const PAGE_TAGE_LLM: PageTag = { id: '4', text: 'llm', Icon: CopilotIcon, color:'coral'  };
const PAGE_TAGE_PYTHON: PageTag = { id: '5', text: 'python', Icon: CopilotIcon, color:'gray' , metadata: { fillColor: 'var(--base-color-green-0)' } };
const PAGE_TAGE_PYTORCH: PageTag = { id: '6', text: 'pytorch', Icon: CopilotIcon, color:'green'  };
const PAGE_TAGE_SPATIAL: PageTag = { id: '7', text: 'spatial', Icon: CopilotIcon, color:'lemon'  };
const PAGE_TAGE_TUTORIAL: PageTag = { id: '8', text: 'tutorial', Icon: CopilotIcon, color:'orange' , metadata: { fillColor: 'yellow' } };

export const PAGE_TAGS: PageTag[] = [
  PAGE_TAGE_AI,
  PAGE_TAGE_DEEP_LEARNING,
  PAGE_TAGE_EXAMPLE,
  PAGE_TAGE_LLM,
  PAGE_TAGE_PYTHON,
  PAGE_TAGE_PYTORCH,
  PAGE_TAGE_SPATIAL,
  PAGE_TAGE_TUTORIAL,
]

export const PAGE_TAGS_BY_NAME_MAP = new Map(PAGE_TAGS.map(t => [t.text, t]));
export const PAGE_TAGS_BY_COLOR_MAP = new Map(PAGE_TAGS.map(t => [t.color, t]));
