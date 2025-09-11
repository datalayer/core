/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import { CHANNELS } from '../shared/channels';

export interface IConfigManager {
  get<T = any>(key: string): Promise<T | undefined>;
  set<T = any>(key: string, value: T): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  registerIPCHandlers(): void;
}

class ConfigManager implements IConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, any> = new Map();

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    return this.config.get(key) as T | undefined;
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    this.config.set(key, value);
    log.debug(`Config set: ${key} = ${JSON.stringify(value)}`);
  }

  async has(key: string): Promise<boolean> {
    return this.config.has(key);
  }

  async delete(key: string): Promise<void> {
    const deleted = this.config.delete(key);
    if (deleted) {
      log.debug(`Config deleted: ${key}`);
    }
  }

  async clear(): Promise<void> {
    this.config.clear();
    log.debug('Config cleared');
  }

  registerIPCHandlers(): void {
    const channel = CHANNELS.CONFIG_MANAGER;

    ipcMain.handle(`${channel}:get`, async (_, key: string) => {
      try {
        return await this.get(key);
      } catch (error) {
        log.error(`Config get error for key ${key}:`, error);
        throw error;
      }
    });

    ipcMain.handle(`${channel}:set`, async (_, key: string, value: any) => {
      try {
        await this.set(key, value);
        return true;
      } catch (error) {
        log.error(`Config set error for key ${key}:`, error);
        throw error;
      }
    });

    ipcMain.handle(`${channel}:has`, async (_, key: string) => {
      try {
        return await this.has(key);
      } catch (error) {
        log.error(`Config has error for key ${key}:`, error);
        throw error;
      }
    });

    ipcMain.handle(`${channel}:delete`, async (_, key: string) => {
      try {
        await this.delete(key);
        return true;
      } catch (error) {
        log.error(`Config delete error for key ${key}:`, error);
        throw error;
      }
    });

    ipcMain.handle(`${channel}:clear`, async () => {
      try {
        await this.clear();
        return true;
      } catch (error) {
        log.error('Config clear error:', error);
        throw error;
      }
    });

    log.debug('Config Manager IPC handlers registered');
  }
}

export default ConfigManager;
