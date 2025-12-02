import { describe, expect, mock, test } from 'bun:test';

// Mock dependencies
mock.module('@shared/utils/misc', () => ({
  chunkArray: mock((arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }),
  chunkString: mock((str, maxLength) => {
    if (str.length <= maxLength) return [str];
    const chunks = [];
    for (let i = 0; i < str.length; i += maxLength) {
      chunks.push(str.substring(i, i + maxLength));
    }
    return chunks;
  }),
  // eslint-disable-next-line
  removeColoringFromString: mock((str) => str.replace(/\u001B\[(\d+)m/g, '')),
  wait: mock(async () => {})
}));

describe('log-collector/index', () => {
  describe('LogCollectorStream', () => {
    test('should create writable stream', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();
      expect(stream).toBeDefined();
      expect(stream.writable).toBe(true);
    });

    test('should initialize with AWS SDK manager', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();
      const mockAwsSdkManager: any = {
        isInitialized: true,
        getLogGroup: mock(async () => ({ logGroupName: 'test-group' })),
        createLogGroup: mock(async () => {}),
        createLogStream: mock(async () => {}),
        putLogEvents: mock(async () => {})
      };

      stream.init({
        awsSdkManager: mockAwsSdkManager,
        logGroupName: 'test-log-group',
        logStreamName: 'test-log-stream'
      });

      expect(stream).toBeDefined();
    });

    test('should write log messages', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();

      await new Promise((resolve) => {
        stream.write('Test log message', () => {
          resolve(undefined);
        });
      });

      expect(stream).toBeDefined();
    });

    test('should handle colored log messages', async () => {
      const { LogCollectorStream } = await import('./index');
      const { removeColoringFromString } = await import('@shared/utils/misc');
      const stream = new LogCollectorStream();

      await new Promise((resolve) => {
        stream.write('\u001B[31mRed text\u001B[0m', () => {
          resolve(undefined);
        });
      });

      expect(removeColoringFromString).toHaveBeenCalled();
    });

    test('should chunk large messages', async () => {
      const { LogCollectorStream } = await import('./index');
      const { chunkString } = await import('@shared/utils/misc');
      const stream = new LogCollectorStream();

      const largeMessage = 'a'.repeat(60000);
      await new Promise((resolve) => {
        stream.write(largeMessage, () => {
          resolve(undefined);
        });
      });

      expect(chunkString).toHaveBeenCalled();
    });

    test('should handle JSON objects', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();

      await new Promise((resolve) => {
        stream.write({ message: 'test', level: 'info' }, () => {
          resolve(undefined);
        });
      });

      expect(stream).toBeDefined();
    });

    test('should create log group if not exists', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();
      const mockAwsSdkManager: any = {
        isInitialized: true,
        getLogGroup: mock(async () => null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ logGroupName: 'test-group' }),
        createLogGroup: mock(async () => {}),
        createLogStream: mock(async () => {}),
        putLogEvents: mock(async () => {})
      };

      stream.init({
        awsSdkManager: mockAwsSdkManager,
        logGroupName: 'new-log-group',
        logStreamName: 'test-stream'
      });

      // Write a message to trigger log sending
      await new Promise((resolve) => {
        stream.write('Test message', () => resolve(undefined));
      });

      // Manually trigger send (normally happens on interval)
      await stream.makeFinalSend();

      expect(mockAwsSdkManager.createLogGroup).toHaveBeenCalledWith({
        logGroupName: 'new-log-group'
      });
    });

    test('should create log stream', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();
      const mockAwsSdkManager: any = {
        isInitialized: true,
        getLogGroup: mock(async () => ({ logGroupName: 'test-group' })),
        createLogStream: mock(async () => {}),
        putLogEvents: mock(async () => {})
      };

      stream.init({
        awsSdkManager: mockAwsSdkManager,
        logGroupName: 'test-log-group',
        logStreamName: 'new-stream'
      });

      // Write a message
      await new Promise((resolve) => {
        stream.write('Test message', () => resolve(undefined));
      });

      // Trigger send
      await stream.makeFinalSend();

      expect(mockAwsSdkManager.createLogStream).toHaveBeenCalledWith({
        logGroupName: 'test-log-group',
        logStreamName: 'new-stream'
      });
    });

    test('should batch log events in chunks', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();
      const mockAwsSdkManager: any = {
        isInitialized: true,
        getLogGroup: mock(async () => ({ logGroupName: 'test-group' })),
        createLogStream: mock(async () => {}),
        putLogEvents: mock(async () => {})
      };

      stream.init({
        awsSdkManager: mockAwsSdkManager,
        logGroupName: 'test-log-group',
        logStreamName: 'test-stream'
      });

      // Write multiple messages
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => {
          stream.write(`Message ${i}`, () => resolve(undefined));
        });
      }

      // Trigger send
      await stream.makeFinalSend();

      expect(mockAwsSdkManager.putLogEvents).toHaveBeenCalled();
    });

    test('should skip sending when SDK not initialized', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();
      const mockAwsSdkManager: any = {
        isInitialized: false,
        putLogEvents: mock(async () => {})
      };

      stream.init({
        awsSdkManager: mockAwsSdkManager,
        logGroupName: 'test-log-group',
        logStreamName: 'test-stream'
      });

      await new Promise((resolve) => {
        stream.write('Test message', () => resolve(undefined));
      });

      await stream.makeFinalSend();

      expect(mockAwsSdkManager.putLogEvents).not.toHaveBeenCalled();
    });

    test('should handle errors during log sending', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();
      const mockAwsSdkManager: any = {
        isInitialized: true,
        getLogGroup: mock(async () => ({ logGroupName: 'test-group' })),
        createLogStream: mock(async () => {}),
        putLogEvents: mock(async () => {
          throw new Error('AWS error');
        })
      };

      stream.init({
        awsSdkManager: mockAwsSdkManager,
        logGroupName: 'test-log-group',
        logStreamName: 'test-stream'
      });

      await new Promise((resolve) => {
        stream.write('Test message', () => resolve(undefined));
      });

      await expect(stream.makeFinalSend()).rejects.toThrow('AWS error');
    });

    test('makeFinalSend should clear interval and send remaining logs', async () => {
      const { LogCollectorStream } = await import('./index');
      const stream = new LogCollectorStream();
      const mockAwsSdkManager: any = {
        isInitialized: true,
        getLogGroup: mock(async () => ({ logGroupName: 'test-group' })),
        createLogStream: mock(async () => {}),
        putLogEvents: mock(async () => {})
      };

      stream.init({
        awsSdkManager: mockAwsSdkManager,
        logGroupName: 'test-log-group',
        logStreamName: 'test-stream'
      });

      await new Promise((resolve) => {
        stream.write('Final message', () => resolve(undefined));
      });

      await stream.makeFinalSend();

      expect(mockAwsSdkManager.putLogEvents).toHaveBeenCalled();
    });
  });
});
