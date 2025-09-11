/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type {
  IBaseService,
  TBaseEvents,
} from '../../shared/services/base.interface';
import { getChannelKey } from '../../shared/shared.utils';
import { broadcastMessage } from '../util';

export type ExtractPromiseType<T> = T extends Promise<infer R> ? R : T;

export type MethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

const registeredServices: Record<string, BaseService> = {};

export default abstract class BaseService<TEvents = any>
  implements IBaseService<TEvents>
{
  protected abstract readonly allowedMethods: Set<string>;
  protected abstract readonly channel: string;
  protected exitPriority: number = 0;

  protected registerService() {
    registeredServices[this.channel] = this;
  }

  public async whenReady(): Promise<void> {
    if (this.isServiceRegistered()) return;

    return new Promise(resolve => {
      this.once('whenReady', () => {
        resolve();
      });
    });
  }

  public registerIPCHandlers() {
    this.registerService();

    const allowed = this.allowedMethods;
    allowed.add('whenReady');

    this.listenForWhenReadyEvent();

    ipcMain.handle(
      this.channel,
      async (_event: any, action: string, ...args: any[]) => {
        try {
          if (!allowed.has(action as any)) {
            throw new Error(`${action} not allowed on ${this.channel}`);
          }

          const func: Function = (this as any)[action];
          if (!func || typeof func !== 'function')
            throw new Error(`method ${action} not found on ${this.channel}`);

          this.beforeAction(action, args);

          const response = await func.apply(this, args);

          this.afterAction(action, args);

          return response as unknown;
        } catch (error) {
          log.error(`${this.channel} IPC handler error: ${error}`);
          const wrappedError = new Error(
            `${action} error: ${(error as Error).message ?? error}`
          );
          return wrappedError;
        }
      }
    );

    this.emitReady();
  }

  protected listenForWhenReadyEvent() {
    ipcMain.on(getChannelKey(this.channel, 'whenReady_request'), () => {
      if (!this.isServiceRegistered()) return;
      this.emitReady();
    });
  }

  protected emitReady() {
    this.emit('whenReady', undefined as any);
  }

  protected isServiceRegistered() {
    return !!registeredServices[this.channel];
  }

  protected async beforeAction(_action: string, ..._args: any[]) {}

  protected async afterAction(_action: string, ..._args: any[]) {}

  protected async beforeQuit() {}

  static async beforeQuit(): Promise<void> {
    log.debug('services clean up started');

    const services = Object.values(registeredServices);

    const priorities = Array.from(
      new Set(services.map(service => service.exitPriority))
    ).sort((a, b) => b - a);

    await priorities.reduce(async (prev, priority) => {
      await prev;

      const servicesPart = services.filter(
        service => service.exitPriority === priority
      );
      await Promise.allSettled(
        servicesPart.map(service => service.beforeQuit())
      );
    }, Promise.resolve());

    log.debug('services clean up completed');
  }

  public on<P extends keyof (TEvents & TBaseEvents)>(
    key: P,
    listener: (payload: (TEvents & TBaseEvents)[P]) => void
  ): () => void {
    const channelKey = getChannelKey(this.channel, key as string);

    ipcMain.on(channelKey, listener as () => void);

    return () => {
      ipcMain.removeListener(channelKey, listener);
    };
  }

  public once<P extends keyof (TEvents & TBaseEvents)>(
    key: P,
    listener: (payload: (TEvents & TBaseEvents)[P]) => void
  ): void {
    const channelKey = getChannelKey(this.channel, key as string);
    ipcMain.once(channelKey, listener as () => void);
  }

  protected emit<P extends keyof (TEvents & TBaseEvents)>(
    key: P,
    obj: (TEvents & TBaseEvents)[P]
  ) {
    const channelKey = getChannelKey(this.channel, key as string);
    broadcastMessage(channelKey, obj);
  }
}
