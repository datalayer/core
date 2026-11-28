/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The tabs of a view, one look and one behaviour everywhere (the user, 13
 * November 2026: "create a component for those tabs and use it in all views"):
 * small buttons, the open one primary, the others invisible, as on /evals and
 * /admin/cluster.
 *
 * - A `tablist` of `tab`s, `aria-selected` on the open one, for assistive
 *   technology; ← → Home End move between the enabled tabs and open them.
 * - A tab may be `disabled`, its `title` saying why; it may carry a `count`.
 * - A tab may carry a `leadingVisual`, an icon before its label (the user,
 *   21 November 2026: the application page's Build, Try, Validate and Ship).
 * - `useTabParam` (./useTabParam) keeps the open tab in the address (`?tab=`).
 *
 * @module components/tabs/ViewTabs
 */

import type { ElementType, JSX, KeyboardEvent, ReactNode } from 'react';
import { Fragment, useCallback, useRef } from 'react';
import { Button } from '@primer/react';
import { Box } from '@datalayer/primer-addons';

export type ViewTab<T extends string = string> = {
  id: T;
  label: ReactNode;
  /** Shown beside the label, as a counter: a number, or words such as `24+` when more are not counted. */
  count?: number | string;
  /** Not openable now; `title` says why. */
  disabled?: boolean;
  /** A tooltip: why a tab is disabled, or what it shows. */
  title?: string;
  /** An icon before the label, as Primer's Button draws a leading visual. */
  leadingVisual?: ElementType;
  /**
   * A rule after this tab, setting it apart from those after it (an *All*
   * before the kinds it gathers; the user, 28 November 2026).
   */
  separatorAfter?: boolean;
};

export type ViewTabsProps<T extends string> = {
  tabs: ReadonlyArray<ViewTab<T>>;
  /** The open tab. */
  value: T;
  onChange: (id: T) => void;
  /** What the tabs are of, said to assistive technology. */
  label: string;
  'data-testid'?: string;
  /** The space under the tabs, in Primer's scale; 3 by default, as the views had it. */
  mb?: number;
  /** Beside the tabs, at the right: a toggle, a filter. */
  trailing?: ReactNode;
};

export function ViewTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  'data-testid': testId,
  mb = 3,
  trailing,
}: ViewTabsProps<T>): JSX.Element {
  const refs = useRef(new Map<T, HTMLButtonElement | null>());
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, at: T) => {
      const enabled = tabs.filter(tab => !tab.disabled).map(tab => tab.id);
      const index = enabled.indexOf(at);
      if (index < 0 || enabled.length < 2) {
        return;
      }
      const next =
        event.key === 'ArrowRight'
          ? enabled[(index + 1) % enabled.length]
          : event.key === 'ArrowLeft'
            ? enabled[(index - 1 + enabled.length) % enabled.length]
            : event.key === 'Home'
              ? enabled[0]
              : event.key === 'End'
                ? enabled[enabled.length - 1]
                : undefined;
      if (next === undefined) {
        return;
      }
      event.preventDefault();
      onChange(next);
      refs.current.get(next)?.focus();
    },
    [tabs, onChange],
  );

  const list = (
    <Box
      display="flex"
      gap={1}
      flexWrap="wrap"
      role="tablist"
      aria-label={label}
      data-testid={trailing ? undefined : testId}
    >
      {tabs.map(tab => {
        const selected = tab.id === value;
        return (
          <Fragment key={tab.id}>
            <Button
              ref={(node: HTMLButtonElement | null) => {
                refs.current.set(tab.id, node);
              }}
              size="small"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              variant={selected ? 'primary' : 'invisible'}
              disabled={tab.disabled}
              title={tab.title}
              leadingVisual={tab.leadingVisual}
              // Primer's own counter: its colours follow the button's variant, so it reads on the
              // open tab's primary background in every theme (a CounterLabel child stayed dark on it).
              count={tab.count}
              data-tab={tab.id}
              onClick={tab.disabled ? undefined : () => onChange(tab.id)}
              onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) =>
                onKeyDown(event, tab.id)
              }
            >
              {tab.label}
            </Button>
            {tab.separatorAfter ? (
              <Box
                as="span"
                role="separator"
                aria-orientation="vertical"
                alignSelf="stretch"
                width="1px"
                mx={1}
                my={1}
                bg="border.default"
                data-tab-separator=""
              />
            ) : null}
          </Fragment>
        );
      })}
    </Box>
  );

  return trailing ? (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      flexWrap="wrap"
      mb={mb}
      data-testid={testId}
    >
      {list}
      {trailing}
    </Box>
  ) : (
    <Box mb={mb}>{list}</Box>
  );
}

export default ViewTabs;
