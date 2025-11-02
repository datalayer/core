/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Base SDK class providing core configuration and token management.
 * @module client/base
 */

import { DEFAULT_SERVICE_URLS } from '../api/constants';
import { Environment2 } from '../models/EnvironmentDTO';

/** Handlers for SDK method lifecycle events. */
export interface SDKHandlers {
  /** Called before any SDK method execution */
  beforeCall?: (methodName: string, args: any[]) => void | Promise<void>;
  /** Called after successful SDK method execution */
  afterCall?: (methodName: string, result: any) => void | Promise<void>;
  /** Called when an SDK method throws an error */
  onError?: (methodName: string, error: any) => void | Promise<void>;
}

/** Configuration options for the Datalayer Client. */
export interface DatalayerClientConfig {
  /** Authentication token for API requests */
  token?: string;
  /** URL for the IAM service */
  iamRunUrl?: string;
  /** URL for the Runtimes service */
  runtimesRunUrl?: string;
  /** URL for the Spacer service */
  spacerRunUrl?: string;
  /** Handlers for intercepting SDK method calls */
  handlers?: SDKHandlers;
}

/** Base Client class providing core configuration and token management. */
export class DatalayerClientBase {
  /** URL for IAM service */
  public readonly iamRunUrl: string;
  /** URL for Runtimes service */
  public readonly runtimesRunUrl: string;
  /** URL for Spacer service */
  public readonly spacerRunUrl: string;
  /** Authentication token */
  public token?: string;
  /** Environments */
  public readonly environments: Environment2[] = [];
  /** Method lifecycle handlers */
  public readonly handlers?: SDKHandlers;

  /**
   * Create a DatalayerClient base instance.
   * @param config - Client configuration options
   */
  constructor(config: DatalayerClientConfig) {
    this.iamRunUrl = config.iamRunUrl || DEFAULT_SERVICE_URLS.IAM;
    this.runtimesRunUrl =
      config.runtimesRunUrl || DEFAULT_SERVICE_URLS.RUNTIMES;
    this.spacerRunUrl = config.spacerRunUrl || DEFAULT_SERVICE_URLS.SPACER;
    this.token = config.token;
    this.handlers = config.handlers;
  }

  /**
   * Get the current configuration including service URLs and token.
   * @returns Current configuration
   */
  getConfig(): DatalayerClientConfig {
    return {
      iamRunUrl: this.iamRunUrl,
      runtimesRunUrl: this.runtimesRunUrl,
      spacerRunUrl: this.spacerRunUrl,
      token: this.token,
    };
  }

  /** Get the IAM service URL. */
  public getIamRunUrl(): string {
    return this.iamRunUrl;
  }

  /** Get the Runtimes service URL. */
  public getRuntimesRunUrl(): string {
    return this.runtimesRunUrl;
  }

  /** Get the Spacer service URL. */
  public getSpacerRunUrl(): string {
    return this.spacerRunUrl;
  }

  /** Get the current authentication token. */
  public getToken(): string | undefined {
    return this.token;
  }

  /**
   * set the authentication token for all API requests.
   * @param token - New authentication token
   */
  async setToken(token: string): Promise<void> {
    this.token = token;
  }

  /**
   * Wrap all SDK methods with handlers for cross-cutting concerns.
   * Called automatically by the DatalayerClient constructor.
   *
   * @internal
   */
  protected wrapAllMethods(): void {
    if (!this.handlers) {
      return; // No handlers configured, nothing to wrap
    }

    // Get all method names from the prototype chain
    const methodNames = this.getAllMethodNames();

    // Wrap each method with handlers
    methodNames.forEach(methodName => {
      const original = (this as any)[methodName];
      if (typeof original !== 'function') {
        return;
      }

      // Detect if the original method is async by checking if it's an AsyncFunction
      const isAsync = original.constructor.name === 'AsyncFunction';

      if (isAsync) {
        // Create async wrapped version for originally async methods
        (this as any)[methodName] = async (...args: any[]) => {
          // Call beforeCall handler if defined
          if (this.handlers?.beforeCall) {
            await Promise.resolve(this.handlers.beforeCall(methodName, args));
          }

          try {
            // Call the original async method
            const result = await original.apply(this, args);

            // Call afterCall handler if defined
            if (this.handlers?.afterCall) {
              await Promise.resolve(
                this.handlers.afterCall(methodName, result),
              );
            }

            return result;
          } catch (error) {
            // Call onError handler if defined
            if (this.handlers?.onError) {
              await Promise.resolve(this.handlers.onError(methodName, error));
            }
            throw error;
          }
        };
      } else {
        // Create sync wrapped version for originally sync methods
        (this as any)[methodName] = (...args: any[]) => {
          // Call beforeCall handler if defined (sync version)
          if (this.handlers?.beforeCall) {
            const beforeResult = this.handlers.beforeCall(methodName, args);
            // If beforeCall returns a Promise, we can't await it in sync context
            if (beforeResult instanceof Promise) {
              // Promise ignored in sync context
            }
          }

          try {
            // Call the original sync method
            const result = original.apply(this, args);

            // Call afterCall handler if defined (sync version)
            if (this.handlers?.afterCall) {
              const afterResult = this.handlers.afterCall(methodName, result);
              if (afterResult instanceof Promise) {
                // Promise ignored in sync context
              }
            }

            return result;
          } catch (error) {
            // Call onError handler if defined (sync version)
            if (this.handlers?.onError) {
              const errorResult = this.handlers.onError(methodName, error);
              if (errorResult instanceof Promise) {
                // Promise ignored in sync context
              }
            }
            throw error;
          }
        };
      }
    });
  }

  /**
   * Get all method names from mixins only.
   * @returns Array of mixin method names to wrap
   * @internal
   */
  private getAllMethodNames(): string[] {
    const methodNames = new Set<string>();

    // First, collect all base class methods to exclude
    const baseClassMethods = new Set<string>();
    const basePrototype = DatalayerClientBase.prototype;
    Object.getOwnPropertyNames(basePrototype).forEach(name => {
      baseClassMethods.add(name);
    });

    // Also exclude methods from the concrete SDK class itself
    const sdkPrototype = Object.getPrototypeOf(this).constructor.prototype;
    Object.getOwnPropertyNames(sdkPrototype).forEach(name => {
      baseClassMethods.add(name);
    });

    // Now walk the prototype chain and only include mixin methods
    let obj = Object.getPrototypeOf(this);

    while (obj && obj !== Object.prototype) {
      const names = Object.getOwnPropertyNames(obj);

      names.forEach(name => {
        // Only include if:
        // 1. Not a constructor
        // 2. Not a private method (starts with _)
        // 3. Not a base class method
        // 4. Is actually a function
        if (
          name !== 'constructor' &&
          !name.startsWith('_') &&
          !baseClassMethods.has(name)
        ) {
          const descriptor = Object.getOwnPropertyDescriptor(obj, name);
          if (descriptor && typeof descriptor.value === 'function') {
            methodNames.add(name);
          }
        }
      });

      obj = Object.getPrototypeOf(obj);
    }

    return Array.from(methodNames);
  }

  // Utility Methods
  calculateCreditsFromMinutes(minutes: number, burningRate: number): number {
    const burningRatePerMinute = burningRate * 60;
    return Math.ceil(minutes * burningRatePerMinute);
  }
}
