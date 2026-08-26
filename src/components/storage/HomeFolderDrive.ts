/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The caller's Home Folders as a JupyterLab drive.
 *
 * One implementation of `Contents.IDrive`, so JupyterLab's file browser, the
 * shared `ContentsBrowser` and VS Code's file system provider all read the
 * same listing and write through the same transfer — `uploadHomeFolderFile`,
 * verified, resumable — rather than each carrying an upload of its own.
 *
 * The tree is two levels of one address space: the root names the folders the
 * caller reaches — their own, and one per organization and team — and
 * everything below is a path inside one of them.
 *
 * @module components/storage/HomeFolderDrive
 */

import type { Contents, ServerConnection } from '@jupyterlab/services';
import { ISignal, Signal } from '@lumino/signaling';
import {
  deleteHomeFolderObject,
  listHomeFolderFiles,
  readHomeFolderFile,
  statHomeFolderObject,
  uploadHomeFolderFile,
} from '../../api/contents';
import type { HomeFolderFileEntry } from '../../api/contents';
import { API_BASE_PATHS } from '../../api/constants';

export type HomeFolderDriveOptions = {
  /** Where the Contents service is reached. */
  contentsUrl: string;
  /** The caller's token; the reachable folders are resolved from it. */
  token: string;
  /** The drive's name in JupyterLab, the prefix before `:` in a path. */
  name?: string;
};

/**
 * A folder that has never been written to has no timestamp: it is created the
 * first time a sandbox mounts it. Jupyter's model wants a date, and an
 * unparseable one throws where it is rendered.
 */
const EPOCH = new Date(0).toISOString();

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'py', 'js', 'ts', 'tsx', 'jsx', 'json', 'csv', 'tsv', 'yaml', 'yml',
  'toml', 'html', 'css', 'xml', 'sh', 'sql', 'r', 'jl', 'rst', 'cfg', 'ini', 'log',
]);

const extension = (path: string): string =>
  (path.split('/').pop() ?? '').split('.').pop()?.toLowerCase() ?? '';

const basename = (path: string): string => path.split('/').filter(Boolean).pop() ?? '';

const dirname = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
};

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

const joinChunks = (chunks: Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((size, chunk) => size + chunk.byteLength, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
};

const fileModel = (entry: HomeFolderFileEntry): Contents.IModel => ({
  name: entry.name,
  path: entry.path,
  type: entry.isDirectory ? 'directory' : extension(entry.path) === 'ipynb' ? 'notebook' : 'file',
  writable: true,
  created: entry.modifiedAt || EPOCH,
  last_modified: entry.modifiedAt || EPOCH,
  mimetype: '',
  content: null,
  format: null,
  size: entry.size,
});

/**
 * The Home Folders, as one JupyterLab drive.
 *
 * Reads come from the shared filesystem — what a sandbox wrote as well as what
 * was uploaded. Writes go through the transfer contract: a file the browser
 * hands over in chunks is gathered and sent whole, created, its parts
 * checksummed, then completed; an interrupted upload resumes from the parts
 * the service verified. Checkpoints are the immutable versions the catalog
 * keeps of every object, so there is nothing to create here.
 */
export class HomeFolderDrive implements Contents.IDrive {
  readonly name: string;
  readonly serverSettings: ServerConnection.ISettings;

  private readonly _token: string;
  private readonly _base: string;
  private readonly _fileChanged = new Signal<Contents.IDrive, Contents.IChangedArgs>(this);
  private readonly _pending = new Map<string, Uint8Array[]>();
  private _isDisposed = false;

  constructor(options: HomeFolderDriveOptions) {
    this.name = options.name ?? 'home-folder';
    this._token = options.token;
    this._base = String(options.contentsUrl).replace(/\/$/, '');
    // The browser reads `appUrl` in one error message and nothing else; the
    // requests themselves carry the token explicitly.
    this.serverSettings = {
      baseUrl: this._base,
      appUrl: `${this._base}${API_BASE_PATHS.CONTENTS}/sources/home-folder/`,
      wsUrl: '',
      token: '',
      appendToken: false,
      init: {},
    } as unknown as ServerConnection.ISettings;
  }

  get fileChanged(): ISignal<Contents.IDrive, Contents.IChangedArgs> {
    return this._fileChanged;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  async get(localPath: string, options?: Contents.IFetchOptions): Promise<Contents.IModel> {
    const path = localPath.replace(/^\/+/, '');
    if (path === '') {
      return this._directory('');
    }
    // A folder answers the listing; a file does not, and is found in its parent.
    try {
      return await this._directory(path);
    } catch {
      // Not a folder: fall through.
    }
    const parent = await listHomeFolderFiles(this._token, dirname(path), this._base);
    const entry = parent.items.find(item => basename(item.path) === basename(path));
    if (!entry || entry.isDirectory) {
      throw new Error(`No file at ${path} in the Home Folder`);
    }
    const model = fileModel(entry);
    if (options?.content === false) {
      return model;
    }
    const { body } = await readHomeFolderFile(this._token, path, {}, this._base);
    const bytes = new Uint8Array(body);
    if (model.type === 'notebook') {
      return { ...model, content: JSON.parse(new TextDecoder().decode(bytes)), format: 'json', mimetype: 'application/x-ipynb+json' };
    }
    if (options?.format === 'base64' || !TEXT_EXTENSIONS.has(extension(path))) {
      return { ...model, content: encodeBase64(bytes), format: 'base64', mimetype: 'application/octet-stream' };
    }
    return { ...model, content: new TextDecoder().decode(bytes), format: 'text', mimetype: 'text/plain' };
  }

  getDownloadUrl(localPath: string): Promise<string> {
    return Promise.resolve(
      `${this._base}${API_BASE_PATHS.CONTENTS}/sources/home-folder/files/content?path=${encodeURIComponent(localPath.replace(/^\/+/, ''))}`,
    );
  }

  async newUntitled(options: Contents.ICreateOptions = {}): Promise<Contents.IModel> {
    const type = options.type ?? 'file';
    if (type === 'directory') {
      throw new Error('A folder appears in the Home Folder when a file is saved into it.');
    }
    const parent = (options.path ?? '').replace(/^\/+|\/+$/g, '');
    const name = type === 'notebook' ? 'Untitled.ipynb' : `untitled${options.ext ?? '.txt'}`;
    const path = parent ? `${parent}/${name}` : name;
    const content = type === 'notebook'
      ? JSON.stringify({ cells: [], metadata: {}, nbformat: 4, nbformat_minor: 5 })
      : '';
    return this.save(path, { type, format: 'text', content });
  }

  async delete(localPath: string): Promise<void> {
    const path = localPath.replace(/^\/+/, '');
    const object = await statHomeFolderObject(this._token, path, this._base);
    await deleteHomeFolderObject(this._token, object.uid, this._base);
    this._fileChanged.emit({ type: 'delete', oldValue: { path }, newValue: null });
  }

  async rename(oldLocalPath: string, newLocalPath: string): Promise<Contents.IModel> {
    const current = await this.get(oldLocalPath, { content: true, format: 'base64' });
    const moved = await this.save(newLocalPath, { type: current.type, format: current.format, content: current.content });
    await this.delete(oldLocalPath);
    this._fileChanged.emit({ type: 'rename', oldValue: current, newValue: moved });
    return moved;
  }

  /**
   * Upload, through the same transfer the CLI and the objects view use.
   *
   * A file is chunked by the browser — Jupyter's protocol numbers the chunks
   * and marks the last one `-1` — and whole by the transfer contract, so the
   * chunks are gathered and sent when the last one arrives. One idempotency
   * key per file and size, so the retry of an interrupted upload resumes the
   * transfer it started rather than opening a second.
   */
  async save(localPath: string, model: Partial<Contents.IModel> = {}): Promise<Contents.IModel> {
    const path = localPath.replace(/^\/+/, '');
    if (model.type === 'directory') {
      throw new Error('A folder appears in the Home Folder when a file is saved into it.');
    }
    const bytes = this._bytes(model);
    const chunk = (model as { chunk?: number }).chunk;
    if (chunk !== undefined && chunk !== -1) {
      this._pending.set(path, [...(this._pending.get(path) ?? []), bytes]);
      return { ...fileModel({ name: basename(path), path, isDirectory: false, size: 0, modifiedAt: null }), chunk } as Contents.IModel;
    }
    const content = joinChunks([...(this._pending.get(path) ?? []), bytes]);
    this._pending.delete(path);
    const transfer = await uploadHomeFolderFile(
      this._token,
      path,
      content,
      {
        idempotencyKey: `home-folder-drive:${path}:${content.byteLength}`,
        mediaType: model.mimetype || 'application/octet-stream',
        overwrite: 'new-version',
      },
      this._base,
    );
    const saved = fileModel({
      name: basename(path),
      path,
      isDirectory: false,
      size: transfer.expectedSize ?? content.byteLength,
      modifiedAt: transfer.completedAt ?? null,
    });
    this._fileChanged.emit({ type: 'save', oldValue: null, newValue: saved });
    return saved;
  }

  async copy(localPath: string, toLocalDir: string): Promise<Contents.IModel> {
    const current = await this.get(localPath, { content: true, format: 'base64' });
    const target = `${toLocalDir.replace(/^\/+|\/+$/g, '')}/${basename(localPath)}`.replace(/^\//, '');
    return this.save(target, { type: current.type, format: current.format, content: current.content });
  }

  /** Every version the catalog keeps is a checkpoint already; nothing to create. */
  createCheckpoint(localPath: string): Promise<Contents.ICheckpointModel> {
    return Promise.resolve({ id: `latest:${localPath}`, last_modified: new Date().toISOString() });
  }

  listCheckpoints(): Promise<Contents.ICheckpointModel[]> {
    return Promise.resolve([]);
  }

  restoreCheckpoint(): Promise<void> {
    return Promise.resolve();
  }

  deleteCheckpoint(): Promise<void> {
    return Promise.resolve();
  }

  private async _directory(path: string): Promise<Contents.IModel> {
    const listing = await listHomeFolderFiles(this._token, path, this._base);
    return {
      name: basename(path),
      path,
      type: 'directory',
      writable: true,
      created: EPOCH,
      last_modified: EPOCH,
      mimetype: '',
      content: listing.items.map(fileModel),
      format: 'json',
      size: undefined,
    };
  }

  private _bytes(model: Partial<Contents.IModel>): Uint8Array {
    if (model.content === null || model.content === undefined) {
      return new Uint8Array(0);
    }
    if (typeof model.content !== 'string') {
      return new TextEncoder().encode(JSON.stringify(model.content, null, 1));
    }
    return model.format === 'base64' ? decodeBase64(model.content) : new TextEncoder().encode(model.content);
  }
}

export default HomeFolderDrive;
