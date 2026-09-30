import { describe, expect, test } from 'bun:test';
import { pendingOperations } from '@application-services/command-lifecycle/pending-operations';
import { cancelablePublicMethods, resetDomainServiceInitialization, skipInitIfInitialized } from './decorators';

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
  test('initializes separate instances of the same service independently', async () => {
    class Service {
      initCalls = 0;
      init = async () => {
        this.initCalls++;
      };
    }
    const first = skipInitIfInitialized(new Service());
    const second = skipInitIfInitialized(new Service());
    await first.init();
    await second.init();
    expect(first.initCalls).toBe(1);
    expect(second.initCalls).toBe(1);
    resetDomainServiceInitialization();
    await first.init();
    expect(first.initCalls).toBe(2);
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

    firstAttempt.resolve('ready');
    expect(await firstResult).toBe('ready');
    expect(await secondResult).toBe('ready');

    expect(await service.init()).toBe('ready');
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

    await expect(service.init()).resolves.toBe('ready');
    expect(service.initCalls).toBe(2);
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
  test('cancels pending results and still observes their later failures', async () => {
    const operation = deferred<string>();
    const service = cancelablePublicMethods({ run: () => operation.promise });
    const result = service.run();
    pendingOperations.cancelAll(new Error('interrupted'));
    await expect(result).rejects.toThrow('interrupted');
    expect(pendingOperations.size).toBe(0);
    operation.reject(new Error('late underlying failure'));
    await Promise.resolve();
    await Promise.resolve();
    expect(pendingOperations.size).toBe(0);
  });
  test('removes a fulfilled operation from the pending registry', async () => {
    class Service {
      run = () => Promise.resolve('done');
    }
    const service = cancelablePublicMethods(new Service());

    const result = service.run();
    expect(Array.from({ length: pendingOperations.size })).toHaveLength(1);

    await expect(result).resolves.toBe('done');
    expect(pendingOperations.size).toBe(0);
  });

  test('removes a rejected operation from the pending registry', async () => {
    class Service {
      run = () => Promise.reject(new Error('operation failed'));
    }
    const service = cancelablePublicMethods(new Service());

    const result = service.run();
    expect(Array.from({ length: pendingOperations.size })).toHaveLength(1);

    await expect(result).rejects.toThrow('operation failed');
    expect(pendingOperations.size).toBe(0);
  });
});
