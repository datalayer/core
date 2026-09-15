/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { JSX } from 'react';
import {
  type ReactNode,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Notification } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';
import {
  ActionList,
  ActionMenu,
  Heading,
  IconButton,
  SegmentedControl,
  Spinner,
  TreeView,
  Text,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { Blankslate, Dialog } from '@primer/react/experimental';
import { ListUnorderedIcon, SyncIcon, TableIcon } from '@primer/octicons-react';
import { useIsMounted } from 'usehooks-ts';
import { useToast } from '../../hooks';
import { UploadIconButton } from '../buttons';
import {
  DirectoryItem,
  TreeItem,
  IContentsView,
  modelToView,
} from './ContentsItems';
import { CONTENTS_BROWSER_MOCK_MANAGER } from './ContentsBrowserMock';
import { ContentsTable } from './ContentsTable';

/**
 * The maximum upload size (in bytes) for notebook version < 5.1.0
 */
export const LARGE_FILE_SIZE = 15 * 1024 * 1024;

/**
 * The size (in bytes) of the biggest chunk we should upload at once.
 */
export const CHUNK_SIZE = 1024 * 1024;

/**
 * How the contents browser renders the contents.
 *
 * - `tree`: an expandable tree of folders and files.
 * - `table`: a table listing one folder at a time; folder rows open the
 *   folder and a `..` row goes back to the parent folder.
 */
export type ContentsBrowserView = 'tree' | 'table';

/**
 * Views offered by the header toggle.
 */
const CONTENTS_BROWSER_VIEWS: {
  value: ContentsBrowserView;
  label: string;
  icon: typeof ListUnorderedIcon;
}[] = [
  { value: 'tree', label: 'Tree view', icon: ListUnorderedIcon },
  { value: 'table', label: 'Table view', icon: TableIcon },
];

/**
 * Storage browser component properties
 */
export interface IContentsBrowserProps {
  /**
   * Contents manager.
   */
  contents?: Contents.IManager;
  /**
   * Render an invented Code Sandbox filesystem for documentation and stories.
   */
  mock?: boolean;
  /**
   * Contents manager.
   */
  localContents?: Contents.IManager;
  /**
   * Document registry.
   */
  documentRegistry?: DocumentRegistry;
  /**
   * Optional title for the browser heading.
   * Defaults to "Contents Browser".
   */
  title?: ReactNode;
  /**
   * How the contents are rendered: as a tree (default) or as a table.
   *
   * The user can switch views from the header toggle; changing this prop
   * applies the requested view.
   */
  view?: ContentsBrowserView;
  /**
   * Callback when the user switches views from the header toggle.
   */
  onViewChange?: (view: ContentsBrowserView) => void;
}

/**
 * Storage browser component.
 */
export function ContentsBrowser(props: IContentsBrowserProps): JSX.Element {
  const {
    mock = false,
    title = (
      <Heading
        as="h4"
        sx={{
          fontSize: 'var(--text-title-size-small)',
          lineHeight: 'var(--text-title-lineHeight-medium)',
          fontWeight: 'var(--text-title-weight-medium)',
        }}
      >
        Contents Browser
      </Heading>
    ),
  } = props;
  // A browser with nothing behind it shows nothing — never the sample tree.
  // The sample is for a documentation preview that asks for it by name; a
  // caller that has not resolved its sandbox yet must not appear to have.
  const contents =
    props.contents ?? (mock ? CONTENTS_BROWSER_MOCK_MANAGER : undefined);
  if (!contents) {
    return (
      <Box sx={{ p: 3 }}>
        {title}
        <Text sx={{ display: 'block', color: 'fg.muted', fontSize: 1, mt: 2 }}>
          No filesystem is connected.
        </Text>
      </Box>
    );
  }
  return (
    <ConnectedContentsBrowser
      {...props}
      contents={contents}
      mock={mock}
      title={title}
    />
  );
}

const ConnectedContentsBrowser = (
  props: IContentsBrowserProps & {
    contents: Contents.IManager;
    mock: boolean;
    title: ReactNode;
  },
): JSX.Element => {
  const {
    contents,
    mock,
    title,
    localContents,
    documentRegistry,
    onViewChange,
  } = props;
  const isMounted = useIsMounted();
  const { trackAsyncTask } = useToast();
  const [children, setChildren] = useState<IContentsView[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<
    | (IContentsView & {
        /**
         * Refresh the model children.
         */
        refresh: () => void;
      })
    | null
  >(null);
  const [contextMenuAnchor, setContextMenuAnchor] =
    useState<MutableRefObject<HTMLElement | null> | null>(null);
  const [openDeleteConfirmation, setOpenDeleteConfirmation] = useState(false);
  const [copyToLocalConfirmation, setCopyToLocalConfirmation] = useState(false);
  const [view, setView] = useState<ContentsBrowserView>(props.view ?? 'tree');
  /**
   * Folder listed by the table view; the empty string is the root.
   */
  const [folderPath, setFolderPath] = useState('');
  const [folderItems, setFolderItems] = useState<IContentsView[] | null>(null);
  const [isFolderLoading, setIsFolderLoading] = useState(false);
  /**
   * Identifier of the latest folder request, so that a slow response for a
   * folder the user already left is dropped.
   */
  const folderRequest = useRef(0);
  useEffect(() => {
    setView(props.view ?? 'tree');
  }, [props.view]);
  const refresh = useCallback(() => {
    contents
      .get('')
      .then(model => {
        setIsLoading(false);
        setChildren(modelToView(model.content, documentRegistry));
      })
      .catch(reason => {
        setIsLoading(false);
        console.error(
          `Failed to fetch folder '' content for manager ${contents.serverSettings.appUrl}.`,
          reason,
        );
      });
  }, [contents]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const refreshFolder = useCallback(() => {
    const request = ++folderRequest.current;
    setIsFolderLoading(true);
    contents
      .get(folderPath)
      .then(model => {
        if (request !== folderRequest.current || !isMounted()) {
          return;
        }
        setIsFolderLoading(false);
        setFolderItems(modelToView(model.content, documentRegistry));
      })
      .catch(reason => {
        if (request !== folderRequest.current || !isMounted()) {
          return;
        }
        setIsFolderLoading(false);
        console.error(
          `Failed to fetch folder '${folderPath}' content for manager ${contents.serverSettings.appUrl}.`,
          reason,
        );
      });
  }, [contents, folderPath, documentRegistry]);
  useEffect(() => {
    if (view === 'table') {
      refreshFolder();
    }
  }, [view, refreshFolder]);
  /**
   * Refresh whatever the active view displays.
   */
  const refreshView = view === 'table' ? refreshFolder : refresh;
  const changeView = useCallback(
    (next: ContentsBrowserView) => {
      if (next === view) {
        return;
      }
      // The selection belongs to the view being left.
      setSelectedItem(null);
      setContextMenuAnchor(null);
      setView(next);
      onViewChange?.(next);
    },
    [view, onViewChange],
  );
  const navigateTo = useCallback(
    (path: string) => {
      setSelectedItem(null);
      setContextMenuAnchor(null);
      if (path === folderPath) {
        // Already there: reload the folder instead.
        refreshFolder();
      } else {
        setFolderPath(path);
      }
    },
    [folderPath, refreshFolder],
  );
  const upload = useCallback(
    /**
     * @param file File to upload
     */
    async (file: File) => {
      const checkIsMounted = () => {
        if (!isMounted()) {
          return Promise.reject(
            `Failed to upload ${file.name}; StorageBrowser component is unmounted.`,
          );
        }
      };
      checkIsMounted();
      const chunked = file.size > CHUNK_SIZE;
      const currentDirectory = selectedItem
        ? selectedItem.type === 'directory'
          ? selectedItem.path
          : PathExt.dirname(selectedItem.path)
        : view === 'table'
          ? folderPath
          : '';
      const path = currentDirectory
        ? PathExt.join(currentDirectory, file.name)
        : file.name;
      const name = file.name;
      const type = 'file';
      const format = 'base64';
      const uploadChunk = async (
        blob: Blob,
        chunk?: number,
      ): Promise<Contents.IModel> => {
        checkIsMounted();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        await new Promise((resolve, reject) => {
          reader.onload = resolve;
          reader.onerror = event =>
            reject(`Failed to upload "${file.name}":` + event);
        });
        checkIsMounted();
        // remove header https://stackoverflow.com/a/24289420/907060
        const content = (reader.result as string).split(',')[1];
        const model: Partial<Contents.IModel> = {
          type,
          format,
          name,
          chunk,
          content,
        };
        return await contents.save(path, model);
      };
      const toastOptions = {
        error: {
          message: reason => {
            const msg = `Failed to upload ${file.name}.`;
            console.error(msg, reason);
            return msg;
          },
        },
        pending: { message: `Uploading ${file.name}…` },
        success: { message: () => `${file.name} uploaded.` },
      } satisfies Notification.IPromiseOptions<any>;
      if (chunked) {
        const task = new PromiseDelegate<any>();
        trackAsyncTask(task.promise, toastOptions);
        try {
          let finalModel: Contents.IModel | undefined;
          for (let start = 0; !finalModel; start += CHUNK_SIZE) {
            const end = start + CHUNK_SIZE;
            const lastChunk = end >= file.size;
            const chunk = lastChunk ? -1 : end / CHUNK_SIZE;
            const currentModel = await uploadChunk(
              file.slice(start, end),
              chunk,
            );
            if (lastChunk) {
              finalModel = currentModel;
              task.resolve(finalModel);
            }
          }
          if (selectedItem) {
            selectedItem.refresh();
          } else {
            refreshView();
          }
          return finalModel;
        } catch (error) {
          task.reject(error);
          throw error;
        }
      } else {
        const task = uploadChunk(file);
        trackAsyncTask(task, toastOptions);
        task.then(() => {
          if (selectedItem) {
            selectedItem.refresh();
          } else {
            refreshView();
          }
        });
        return task;
      }
    },
    [contents, selectedItem, refreshView, view, folderPath],
  );
  const onContextMenu = useCallback(
    (ref: MutableRefObject<HTMLElement | null>) => {
      if (contextMenuAnchor === ref) {
        setContextMenuAnchor(null);
      } else {
        setContextMenuAnchor(ref);
      }
    },
    [contextMenuAnchor],
  );
  const onSelectDelete = useCallback(() => {
    setOpenDeleteConfirmation(true);
  }, []);
  const deleteItem = useCallback(() => {
    if (selectedItem) {
      const task = contents.delete(selectedItem.path);
      trackAsyncTask(task, {
        success: { message: () => `${selectedItem.path} deleted.` },
        pending: { message: `Deleting ${selectedItem.path}…` },
        error: {
          message: reason => {
            const msg = `Failed to delete ${selectedItem.path}.`;
            console.error(msg, reason);
            return msg;
          },
        },
      });
      task.finally(() => {
        selectedItem.refresh();
      });
    }
    setOpenDeleteConfirmation(false);
  }, [contents, selectedItem]);
  const onSelectCopyToLocal = useCallback(() => {
    setCopyToLocalConfirmation(true);
  }, []);
  const copyToLocal = useCallback(() => {
    if (selectedItem && localContents) {
      contents.get(selectedItem.path).then(model => {
        const copyTask = localContents?.save(model.path, model);
        trackAsyncTask(copyTask, {
          success: { message: () => `${selectedItem.path} copied to local.` },
          pending: { message: `Copying to local ${selectedItem.path}…` },
          error: {
            message: reason => {
              const msg = `Failed to copy to local ${selectedItem.path}.`;
              console.error(msg, reason);
              return msg;
            },
          },
        });
        copyTask.finally(() => {
          selectedItem.refresh();
        });
        setCopyToLocalConfirmation(false);
      });
    }
  }, [localContents, selectedItem]);
  const onSelect = useCallback(
    (item: IContentsView, refresh: () => void) => {
      setSelectedItem(
        item.path === selectedItem?.path ? null : { ...item, refresh },
      );
    },
    [selectedItem],
  );
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateAreas: `"header" "content"`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          gridArea: 'header',
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
          {title}
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'nowrap',
            flexShrink: 0,
          }}
        >
          <SegmentedControl
            aria-label="Contents view"
            size="small"
            onChange={index => {
              changeView(CONTENTS_BROWSER_VIEWS[index].value);
            }}
          >
            {CONTENTS_BROWSER_VIEWS.map(candidate => (
              <SegmentedControl.IconButton
                key={candidate.value}
                icon={candidate.icon}
                aria-label={candidate.label}
                selected={candidate.value === view}
              />
            ))}
          </SegmentedControl>
          <IconButton
            variant="invisible"
            aria-label={'Refresh contents browser.'}
            title={'Refresh contents browser.'}
            icon={SyncIcon}
            onClick={refreshView}
            disabled={mock}
          />
          {!mock && (
            <UploadIconButton
              label={'Upload a file'}
              multiple
              upload={upload}
            />
          )}
          {/*
            <IconButton
              aria-label={'Refresh'}
              icon={SyncIcon}
              size="small"
              variant="invisible"
              onClick={() => {
                refresh();
              }}
            />
          */}
        </Box>
      </Box>
      {isLoading ? (
        <Box
          sx={{
            gridArea: 'content',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40px',
            height: '100vh',
          }}
        >
          <Spinner />
        </Box>
      ) : (
        <Box sx={{ gridArea: 'content' }}>
          {view === 'table' ? (
            folderItems === null && !isFolderLoading ? (
              <Blankslate>
                <Blankslate.Heading>No contents</Blankslate.Heading>
              </Blankslate>
            ) : (
              <ContentsTable
                path={folderPath}
                items={folderItems ?? []}
                current={selectedItem}
                loading={isFolderLoading}
                onNavigate={navigateTo}
                onSelect={item => {
                  onSelect(item, refreshFolder);
                }}
                onContextMenu={onContextMenu}
              />
            )
          ) : children ? (
            <TreeView>
              {children?.map(child => {
                return child.type === 'directory' ? (
                  <DirectoryItem
                    key={child.name}
                    item={child}
                    contents={contents}
                    current={selectedItem}
                    documentRegistry={documentRegistry}
                    onContextMenu={onContextMenu}
                    onSelect={onSelect}
                  />
                ) : (
                  <TreeItem
                    key={child.name}
                    item={child}
                    current={selectedItem?.path === child.path}
                    onSelect={item => {
                      onSelect(item, refresh);
                    }}
                    onContextMenu={onContextMenu}
                  />
                );
              })}
            </TreeView>
          ) : (
            <Blankslate>
              <Blankslate.Heading>No contents</Blankslate.Heading>
            </Blankslate>
          )}
          {!mock && contextMenuAnchor !== null && (
            <ActionMenu
              // Primer 37 types `anchorRef` with React 18's non-nullable
              // `RefObject<HTMLElement>`; the anchor this menu tracks is nullable.
              anchorRef={
                (contextMenuAnchor ?? undefined) as
                  React.RefObject<HTMLElement> | undefined
              }
              open={contextMenuAnchor?.current !== null}
              onOpenChange={() => {
                setContextMenuAnchor(null);
              }}
            >
              <ActionMenu.Overlay>
                <ActionList>
                  <ActionList.Item
                    title="Delete the active item."
                    onSelect={onSelectDelete}
                  >
                    Delete…
                  </ActionList.Item>
                  {localContents && (
                    <ActionList.Item
                      title="Copy the active item to the local drive."
                      onSelect={onSelectCopyToLocal}
                    >
                      Copy to local drive…
                    </ActionList.Item>
                  )}
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>
          )}
          {openDeleteConfirmation && (
            <Dialog
              title={
                <span style={{ color: 'var(--fgColor-default)' }}>
                  Confirm deletion
                </span>
              }
              onClose={() => {
                setOpenDeleteConfirmation(false);
              }}
              footerButtons={[
                {
                  buttonType: 'default',
                  content: 'Cancel',
                  onClick: () => {
                    setOpenDeleteConfirmation(false);
                  },
                },
                {
                  buttonType: 'danger',
                  content: 'Delete',
                  onClick: () => {
                    deleteItem();
                  },
                },
              ]}
            >{`Are you sure you want to delete ${selectedItem?.path}?`}</Dialog>
          )}
          {copyToLocalConfirmation && (
            <Dialog
              title={
                <span style={{ color: 'var(--fgColor-default)' }}>
                  Confirm copy to local
                </span>
              }
              onClose={() => {
                setCopyToLocalConfirmation(false);
              }}
              footerButtons={[
                {
                  buttonType: 'default',
                  content: 'Cancel',
                  onClick: () => {
                    setCopyToLocalConfirmation(false);
                  },
                },
                {
                  buttonType: 'danger',
                  content: 'Copy to local',
                  onClick: () => {
                    copyToLocal();
                  },
                },
              ]}
            >
              {`Are you sure you want to copy to local ${selectedItem?.path}?`}
            </Dialog>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ContentsBrowser;
