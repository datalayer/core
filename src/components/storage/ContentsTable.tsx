/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { JSX } from 'react';
import {
  Fragment,
  type KeyboardEvent,
  type MouseEvent,
  type MutableRefObject,
  useRef,
} from 'react';
import { PathExt } from '@jupyterlab/coreutils';
import { Link, RelativeTime, Spinner, Text } from '@primer/react';
import { Table } from '@primer/react/experimental';
import { Box } from '@datalayer/primer-addons';
import {
  FileDirectoryFillIcon,
  FileDirectoryIcon,
  FileIcon,
} from '@primer/octicons-react';
import { IContentsView } from './ContentsItems';

/**
 * Contents table component properties.
 */
export interface IContentsTableProps {
  /**
   * Path of the folder listed by the table; the empty string is the root.
   */
  path: string;
  /**
   * Items of the listed folder.
   */
  items: IContentsView[];
  /**
   * Currently selected item.
   */
  current: IContentsView | null;
  /**
   * Whether the folder content is being (re)fetched; a spinner replaces the
   * rows while it is.
   */
  loading?: boolean;
  /**
   * Callback when a folder is opened, either from a row, the `..` row or the
   * path bar. Navigating to the listed folder reloads it.
   */
  onNavigate: (path: string) => void;
  /**
   * Callback on item selection.
   */
  onSelect: (item: IContentsView) => void;
  /**
   * Callback on context menu event.
   */
  onContextMenu: (ref: MutableRefObject<HTMLElement | null>) => void;
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Format a byte count for display.
 */
export function formatSize(size?: number | null): string {
  if (size === undefined || size === null) {
    return '';
  }
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${SIZE_UNITS[unit]}`;
}

/**
 * Split a folder path into its ancestors, root first.
 */
function pathSegments(path: string): { name: string; path: string }[] {
  const segments: { name: string; path: string }[] = [];
  if (path) {
    path.split('/').forEach(name => {
      const parent = segments[segments.length - 1]?.path ?? '';
      segments.push({
        name,
        path: parent ? PathExt.join(parent, name) : name,
      });
    });
  }
  return segments;
}

interface IPathSegmentProps {
  /**
   * Label of the segment.
   */
  name: string;
  /**
   * Folder the segment leads to.
   */
  path: string;
  /**
   * Whether the segment is the listed folder.
   */
  current: boolean;
  /**
   * Tooltip.
   */
  title: string;
  /**
   * Callback when the segment is activated.
   */
  onNavigate: (path: string) => void;
}

/**
 * One clickable part of the path bar.
 */
function PathSegment(props: IPathSegmentProps): JSX.Element {
  const { name, path, current, title, onNavigate } = props;
  return (
    <Link
      as="button"
      type="button"
      title={title}
      aria-current={current ? 'location' : undefined}
      onClick={() => onNavigate(path)}
      sx={current ? { color: 'fg.default', fontWeight: 'semibold' } : undefined}
    >
      {name}
    </Link>
  );
}

const ROW_STYLE = { cursor: 'pointer' } as const;

const SELECTED_ROW_STYLE = {
  ...ROW_STYLE,
  backgroundColor: 'var(--bgColor-accent-muted)',
} as const;

function isActivationKey(event: KeyboardEvent<HTMLElement>): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

interface IParentRowProps {
  /**
   * Path of the parent folder.
   */
  path: string;
  /**
   * Callback when the row is activated.
   */
  onNavigate: (path: string) => void;
}

/**
 * The `..` row navigating to the parent folder.
 */
function ParentRow(props: IParentRowProps): JSX.Element {
  const { path, onNavigate } = props;
  const goUp = () => onNavigate(path);
  return (
    <Table.Row
      tabIndex={0}
      style={ROW_STYLE}
      title="Go to the parent folder."
      onClick={goUp}
      onKeyDown={event => {
        if (isActivationKey(event)) {
          event.preventDefault();
          goUp();
        }
      }}
    >
      <Table.Cell scope="row">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FileDirectoryIcon />
          <span>..</span>
        </Box>
      </Table.Cell>
      <Table.Cell />
      <Table.Cell />
    </Table.Row>
  );
}

interface IContentsRowProps {
  /**
   * Item model.
   */
  item: IContentsView;
  /**
   * Whether the item is currently selected or not.
   */
  current: boolean;
  /**
   * Callback when a folder row is activated.
   */
  onNavigate: (path: string) => void;
  /**
   * Callback on item selection.
   */
  onSelect: (item: IContentsView) => void;
  /**
   * Callback on context menu event.
   */
  onContextMenu: (ref: MutableRefObject<HTMLElement | null>) => void;
}

/**
 * A folder or file row.
 */
function ContentsRow(props: IContentsRowProps): JSX.Element {
  const { item, current, onNavigate, onSelect, onContextMenu } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const isDirectory = item.type === 'directory';
  const icon = item.fileType?.icon;
  const activate = () => {
    if (isDirectory) {
      onNavigate(item.path);
    } else {
      onSelect(item);
    }
  };
  return (
    <Table.Row
      tabIndex={0}
      aria-selected={current}
      style={current ? SELECTED_ROW_STYLE : ROW_STYLE}
      title={isDirectory ? `Open ${item.path}` : item.path}
      onClick={activate}
      onKeyDown={event => {
        if (isActivationKey(event)) {
          event.preventDefault();
          activate();
        }
      }}
      onContextMenu={(event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (!current) {
          onSelect(item);
        }
        onContextMenu(ref);
      }}
    >
      <Table.Cell scope="row">
        <Box
          ref={ref}
          sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}
        >
          {isDirectory ? (
            <FileDirectoryFillIcon />
          ) : icon ? (
            <icon.react tag={'span'} />
          ) : (
            <FileIcon />
          )}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </span>
        </Box>
      </Table.Cell>
      <Table.Cell>
        {item.last_modified ? (
          <RelativeTime date={new Date(item.last_modified)} />
        ) : null}
      </Table.Cell>
      <Table.Cell align="end">
        {isDirectory ? '' : formatSize(item.size)}
      </Table.Cell>
    </Table.Row>
  );
}

/**
 * Table listing the content of one folder.
 *
 * Folder rows open the folder, the `..` row goes to the parent folder and
 * the path bar jumps to any ancestor (or reloads the listed folder).
 */
export function ContentsTable(props: IContentsTableProps): JSX.Element {
  const {
    path,
    items,
    current,
    loading = false,
    onNavigate,
    onSelect,
    onContextMenu,
  } = props;
  const segments = pathSegments(path);
  const label = path ? `Contents of ${path}` : 'Contents of the root folder';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          role="navigation"
          aria-label="Folder path"
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            minWidth: 0,
            fontSize: 1,
          }}
        >
          <PathSegment
            name="/"
            path=""
            current={segments.length === 0}
            title="Go to the root folder."
            onNavigate={onNavigate}
          />
          {segments.map((segment, index) => (
            <Fragment key={segment.path}>
              {index > 0 && <Text sx={{ color: 'fg.muted' }}>/</Text>}
              <PathSegment
                name={segment.name}
                path={segment.path}
                current={index === segments.length - 1}
                title={
                  index === segments.length - 1
                    ? `Reload ${segment.path}`
                    : `Go to ${segment.path}`
                }
                onNavigate={onNavigate}
              />
            </Fragment>
          ))}
        </Box>
      </Box>
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40px',
            padding: 3,
          }}
        >
          <Spinner aria-label="Loading folder…" />
        </Box>
      ) : (
        <Table.Container>
          <Table
            aria-label={label}
            cellPadding="condensed"
            gridTemplateColumns="minmax(0, 1fr) max-content max-content"
          >
            <Table.Head>
              <Table.Row>
                <Table.Header>Name</Table.Header>
                <Table.Header>Last modified</Table.Header>
                <Table.Header align="end">Size</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {path && (
                <ParentRow
                  path={PathExt.dirname(path)}
                  onNavigate={onNavigate}
                />
              )}
              {items.map(item => (
                <ContentsRow
                  key={item.path}
                  item={item}
                  current={item.path === current?.path}
                  onNavigate={onNavigate}
                  onSelect={onSelect}
                  onContextMenu={onContextMenu}
                />
              ))}
            </Table.Body>
          </Table>
        </Table.Container>
      )}
    </Box>
  );
}

export default ContentsTable;
