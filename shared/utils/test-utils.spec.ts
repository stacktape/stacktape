import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { TestExecutor } from './test-utils';

// Mock wait function
mock.module('./misc', () => ({
  wait: () => Promise.resolve()
}));

describe('test-utils', () => {
  describe('TestExecutor', () => {
    let executor: TestExecutor;

    beforeEach(() => {
      executor = new TestExecutor();
    });

    test('should create executor with default options', () => {
      expect(executor.concurrencyLimit).toBe(Infinity);
      expect(executor.waitAfterExecution).toBe(0);
      expect(executor.logExecutions).toBe(false);
      expect(executor.testResults).toEqual({});
      expect(executor.jobQueue).toEqual([]);
      expect(executor.currentlyExecuting).toBe(0);
    });

    test('should create executor with custom options', () => {
      const customExecutor = new TestExecutor({
        concurrencyLimit: 5,
        waitAfterExecution: 1000,
        logExecutions: true
      });
      expect(customExecutor.concurrencyLimit).toBe(5);
      expect(customExecutor.waitAfterExecution).toBe(1000);
      expect(customExecutor.logExecutions).toBe(true);
    });

    test('should execute test function successfully', async () => {
      const testFn = mock(async ({ value }: { value: number }) => value * 2);
      await executor.add({ testFn, testFnProps: { value: 5 } });

      // Wait a bit for execution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(testFn).toHaveBeenCalledTimes(1);
      expect(testFn).toHaveBeenCalledWith({ value: 5 });
      expect(executor.testResults[testFn.name]).toBeDefined();
      expect(executor.testResults[testFn.name].result).toBe(10);
      expect(executor.testResults[testFn.name].error).toBeUndefined();
    });

    test('should handle test function errors', async () => {
      const error = new Error('Test error');
      const testFn = mock(async () => {
        throw error;
      });

      const consoleSpy = mock(() => {});
      console.info = consoleSpy;

      await executor.add({ testFn, testFnProps: {} });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(executor.testResults[testFn.name]).toBeDefined();
      expect(executor.testResults[testFn.name].error).toBe(error);
    });

    test('should respect concurrency limit', async () => {
      const limitedExecutor = new TestExecutor({ concurrencyLimit: 2 });
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const testFn = mock(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise((resolve) => setTimeout(resolve, 50));
        concurrentCount--;
      });

      // Add 5 jobs
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(limitedExecutor.add({ testFn, testFnProps: {} }));
      }

      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(maxConcurrent).toBeLessThanOrEqual(2);
      expect(testFn).toHaveBeenCalledTimes(5);
    });

    test('should queue jobs when concurrency limit is reached', async () => {
      const limitedExecutor = new TestExecutor({ concurrencyLimit: 1 });
      const testFn = mock(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      limitedExecutor.add({ testFn, testFnProps: {} });
      limitedExecutor.add({ testFn, testFnProps: {} });
      limitedExecutor.add({ testFn, testFnProps: {} });

      expect(limitedExecutor.jobQueue.length).toBeGreaterThan(0);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(limitedExecutor.jobQueue.length).toBe(0);
    });

    test('should decrement currentlyExecuting after completion', async () => {
      const testFn = mock(async () => {});

      expect(executor.currentlyExecuting).toBe(0);
      await executor.add({ testFn, testFnProps: {} });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(executor.currentlyExecuting).toBe(0);
    });

    test('should process queued jobs after current jobs complete', async () => {
      const limitedExecutor = new TestExecutor({ concurrencyLimit: 1 });
      const executionOrder: number[] = [];

      const createTestFn = (id: number) =>
        mock(async () => {
          executionOrder.push(id);
          await new Promise((resolve) => setTimeout(resolve, 10));
        });

      const test1 = createTestFn(1);
      const test2 = createTestFn(2);
      const test3 = createTestFn(3);

      limitedExecutor.add({ testFn: test1, testFnProps: {} });
      limitedExecutor.add({ testFn: test2, testFnProps: {} });
      limitedExecutor.add({ testFn: test3, testFnProps: {} });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(executionOrder).toHaveLength(3);
      expect(test1).toHaveBeenCalled();
      expect(test2).toHaveBeenCalled();
      expect(test3).toHaveBeenCalled();
    });
  });
});
