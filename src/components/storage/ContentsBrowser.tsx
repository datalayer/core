/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { MutableRefObject, useCallback, useEffect, useState } from 'react';
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
  Spinner,
  TreeView,
} from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { Blankslate, Dialog } from '@primer/react/experimental';
import { CounterClockWiseIcon } from '@datalayer/icons-react';
import { useIsMounted } from 'usehooks-ts';
import { useToast } from '../../hooks';
import { UploadIconButton } from '../buttons';
import {
  DirectoryItem,
  TreeItem,
  IContentsView,
  modelToView,
} from './ContentsItems';

/**
 * The maximum upload size (in bytes) for notebook version < 5.1.0
 */
export const LARGE_FILE_SIZE = 15 * 1024 * 1024;

/**
 * The size (in bytes) of the biggest chunk we should upload at once.
 */
export const CHUNK_SIZE = 1024 * 1024;

/**
 * Storage browser component properties
 */
export interface IContentsBrowserProps {
  /**
   * Contents manager.
   */
  contents: Contents.IManager;
  /**
   * Contents manager.
   */
  localContents?: Contents.IManager;
  /**
   * Document registry.
   */
  documentRegistry?: DocumentRegistry;
}

/**
 * Storage browser component.
 */
export function ContentsBrowser(props: IContentsBrowserProps): JSX.Element {
  const { contents, localContents, documentRegistry } = props;
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
            refresh();
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
            refresh();
          }
        });
        return task;
      }
    },
    [contents, selectedItem, refresh],
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
    <Box sx={{ display: 'grid', gridTemplateAreas: `"header" "content"` }}>
      <Box sx={{ gridArea: 'header', display: 'flex', alignItems: 'center' }}>
        <Heading
          as="h4"
          sx={{
            fontSize: 'var(--text-title-size-small)',
            lineHeight: 'var(--text-title-lineHeight-medium)',
            fontWeight: 'var(--text-title-weight-medium)',
            flex: '1 1 auto',
          }}
        >
          Contents Browser
        </Heading>
        <Box>
          <IconButton
            variant="invisible"
            aria-label={'Refresh contents browser.'}
            title={'Refresh contents browser.'}
            icon={CounterClockWiseIcon}
            onClick={refresh}
          />
          <UploadIconButton label={'Upload a file'} multiple upload={upload} />
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
          {children ? (
            <>
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
              <ActionMenu
                anchorRef={contextMenuAnchor ?? undefined}
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
              {openDeleteConfirmation && (
                <Dialog
                  title="Confirm deletion"
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
                  title="Confirm copy to local"
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
                >{`Are you sure you want to copy to local ${selectedItem?.path}?`}</Dialog>
              )}
            </>
          ) : (
            <Blankslate>
              <Blankslate.Heading>No contents</Blankslate.Heading>
            </Blankslate>
          )}
        </Box>
      )}
    </Box>
  );
}

export default ContentsBrowser;
