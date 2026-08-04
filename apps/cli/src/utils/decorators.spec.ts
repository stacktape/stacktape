import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { cancelablePublicMethods, skipInitIfInitialized } from './decorators';

const deferred = <T>() => {
  let resolve: (value: T) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject: reject!, resolve: resolve! };
};

describe('skipInitIfInitialized', () => {
  let previousInitializedDomainServices: typeof globalStateManager.initializedDomainServices;

  beforeEach(() => {
    previousInitializedDomainServices = globalStateManager.initializedDomainServices;
    globalStateManager.initializedDomainServices = [];
  });

  afterEach(() => {
    globalStateManager.initializedDomainServices = previousInitializedDomainServices;
  });

  test('joins concurrent initialization and publishes success only after it finishes', async () => {
    const firstAttempt = deferred<string>();
    class ConcurrentService {
      initCalls = 0;

      init = () => {
        this.initCalls += 1;
        return firstAttempt.promise;
      };
    }
    const service = skipInitIfInitialized(new ConcurrentService());

    const firstResult = service.init();
    const secondResult = service.init();

    expect(service.initCalls).toBe(1);
    expect(globalStateManager.initializedDomainServices).not.toContain('ConcurrentService');

    firstAttempt.resolve('ready');
    expect(await firstResult).toBe('ready');
    expect(await secondResult).toBe('ready');
    expect(globalStateManager.initializedDomainServices as string[]).toEqual(['ConcurrentService']);

    expect(await service.init()).toBeUndefined();
    expect(service.initCalls).toBe(1);
  });

  test('allows a failed initialization to be retried', async () => {
    class RetryableService {
      initCalls = 0;

      init = async () => {
        this.initCalls += 1;
        if (this.initCalls === 1) {
          throw new Error('first attempt failed');
        }
        return 'ready';
      };
    }
    const service = skipInitIfInitialized(new RetryableService());

    await expect(service.init()).rejects.toThrow('first attempt failed');
    expect(globalStateManager.initializedDomainServices).not.toContain('RetryableService');

    await expect(service.init()).resolves.toBe('ready');
    expect(service.initCalls).toBe(2);
    expect(globalStateManager.initializedDomainServices as string[]).toEqual(['RetryableService']);
  });

  test('allows retry after an implementation throws before returning a promise', async () => {
    class SynchronouslyFailingService {
      initCalls = 0;

      init = (() => {
        this.initCalls += 1;
        if (this.initCalls === 1) {
          throw new Error('synchronous setup failed');
        }
        return Promise.resolve('ready');
      }) as () => Promise<string>;
    }
    const service = skipInitIfInitialized(new SynchronouslyFailingService());

    await expect(service.init()).rejects.toThrow('synchronous setup failed');
    await expect(service.init()).resolves.toBe('ready');
    expect(service.initCalls).toBe(2);
  });
});

describe('cancelablePublicMethods', () => {
  let previousPendingPromises: typeof applicationManager.pendingCancellablePromises;

  beforeEach(() => {
    previousPendingPromises = applicationManager.pendingCancellablePromises;
    applicationManager.pendingCancellablePromises = {};
  });

  afterEach(() => {
    applicationManager.pendingCancellablePromises = previousPendingPromises;
  });

  test('removes a fulfilled operation from the pending registry', async () => {
    class Service {
      run = () => Promise.resolve('done');
    }
    const service = cancelablePublicMethods(new Service());

    const result = service.run();
    expect(Object.keys(applicationManager.pendingCancellablePromises)).toHaveLength(1);

    await expect(result).resolves.toBe('done');
    expect(applicationManager.pendingCancellablePromises).toEqual({});
  });

  test('removes a rejected operation from the pending registry', async () => {
    class Service {
      run = () => Promise.reject(new Error('operation failed'));
    }
    const service = cancelablePublicMethods(new Service());

    const result = service.run();
    expect(Object.keys(applicationManager.pendingCancellablePromises)).toHaveLength(1);

    await expect(result).rejects.toThrow('operation failed');
    expect(applicationManager.pendingCancellablePromises).toEqual({});
  });
});
