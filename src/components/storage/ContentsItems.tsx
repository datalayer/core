/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { MutableRefObject, useCallback, useRef, useState } from 'react';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { TreeView } from '@primer/react';
import { FileIcon } from '@primer/octicons-react';

/**
 * Content item view model
 */
export interface IContentsView extends Contents.IModel {
  /**
   * Model file type
   */
  fileType?: DocumentRegistry.IFileType;
}

interface ITreeItemProps {
  /**
   * Directory model
   */
  item: IContentsView;
  /**
   * Whether the item is currently selected or not.
   */
  current: boolean;
  /**
   * Callback on context menu event.
   */
  onContextMenu: (ref: MutableRefObject<HTMLElement | null>) => void;
  /**
   * Callback on item selection
   */
  onSelect: (item: IContentsView) => void;
}

/**
 * Directory component properties
 */
interface IDirectoryItemProps extends Omit<ITreeItemProps, 'current' | 'onSelect' | 'refresh'> {
  /**
   * Jupyter contents manager
   */
  contents: Contents.IManager;
  /**
   * Current item
   */
  current: IContentsView | null;
  /**
   * Jupyter document registry
   */
  documentRegistry?: DocumentRegistry;
  /**
   * Callback on item selection
   */
  onSelect: (item: IContentsView, refresh: () => void) => void;
}

export function modelToView(models: Contents.IModel[], docRegistry?: DocumentRegistry): IContentsView[] {
  let items = models.map(model => ({
    ...model,
    fileType: docRegistry?.getFileTypeForModel(model)
  }));
  items = items.filter(model => !model.name.startsWith('.'));
  items.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') {
      return -1;
    }
    if (a.type !== 'directory' && b.type === 'directory') {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });
  return items;
}

/**
 * Directory tree item component
 */
export function DirectoryItem(props: IDirectoryItemProps): JSX.Element {
  const {
    item,
    contents,
    current,
    documentRegistry,
    onContextMenu,
    onSelect
  } = props;
  const ref = useRef<HTMLElement | null>(null);
  const [children, setChildren] = useState<IContentsView[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const refresh = useCallback(() => {
    setIsLoading(true);
    contents.get(item.path)
      .then(model => {
        setIsLoading(false);
        setChildren(modelToView(model.content, documentRegistry));
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [contents, item, documentRegistry]);
  const onExpandedChange = useCallback(
    async (isExpanded: boolean) => {
      if (children === null && isExpanded) {
        refresh();
      }
    },
    [children, item, contents]
  );
  return (
    <TreeView.Item
      ref={ref}
      id={`${item.type}-${item.name}`}
      onExpandedChange={onExpandedChange}
      onSelect={() => {onSelect(item, refresh)}}
      current={item.path === current?.path}
    >
      <TreeView.LeadingVisual>
        <TreeView.DirectoryIcon />
      </TreeView.LeadingVisual>
      <span
        onContextMenu={event => {
          event.preventDefault();
          if (current?.path !== item.path) {
            onSelect(item, refresh);
          }
          onContextMenu(ref);
        }}
      >
        {item.name}
      </span>
      <TreeView.SubTree
        state={
          isLoading
            ? 'loading'
            : (children?.length ?? -1) >= 0
              ? 'done'
              : 'initial'
        }
      >
        {children?.map(child => {
          return child.type === 'directory' ?
            <DirectoryItem
              key={child.name}
              item={child}
              contents={contents}
              current={current}
              documentRegistry={documentRegistry}
              onContextMenu={onContextMenu}
              onSelect={onSelect}
            />
          :
            <TreeItem
              key={child.name}
              item={child}
              current={child.path === current?.path}
              onSelect={item => onSelect(item, refresh)}
              onContextMenu={onContextMenu}
            />
          ;
        })}
      </TreeView.SubTree>
    </TreeView.Item>
  );
}

export function TreeItem(props: ITreeItemProps) {
  const { item, current, onSelect, onContextMenu } = props;
  const ref = useRef<HTMLElement | null>(null);
  const icon = item.fileType?.icon;
  return (
    <TreeView.Item
      key={item.name}
      ref={ref}
      id={`${item.type}-${item.name}`}
      current={current}
      onSelect={() => {onSelect(item)}}
    >
      <TreeView.LeadingVisual>
        {icon ? <icon.react tag={'span'} /> : <FileIcon />}
      </TreeView.LeadingVisual>
      <span
        onContextMenu={event => {
          event.preventDefault();
          if (!current) {
            onSelect(item);
          }
          onContextMenu(ref);
        }}
      >
        {item.name}
      </span>
    </TreeView.Item>
  );
}
