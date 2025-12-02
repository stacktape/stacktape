import { describe, expect, mock, test } from 'bun:test';
import { getDefaultRuntimeForExtension } from './runtimes';

// Mock the config
const mockLambdaRuntimesForFileExtension = {
  '.js': ['nodejs20.x', 'nodejs18.x'],
  '.mjs': ['nodejs20.x', 'nodejs18.x'],
  '.ts': ['nodejs20.x', 'nodejs18.x'],
  '.py': ['python3.12', 'python3.11'],
  '.go': ['provided.al2023', 'provided.al2'],
  '.java': ['java21', 'java17']
};

mock.module('@config', () => ({
  lambdaRuntimesForFileExtension: mockLambdaRuntimesForFileExtension
}));

describe('runtimes', () => {
  describe('getDefaultRuntimeForExtension', () => {
    test('should return first runtime for .js extension', () => {
      const runtime = getDefaultRuntimeForExtension('.js' as any);
      expect(runtime).toBe('nodejs20.x');
    });

    test('should return first runtime for .mjs extension', () => {
      const runtime = getDefaultRuntimeForExtension('.mjs' as any);
      expect(runtime).toBe('nodejs20.x');
    });

    test('should return first runtime for .ts extension', () => {
      const runtime = getDefaultRuntimeForExtension('.ts' as any);
      expect(runtime).toBe('nodejs20.x');
    });

    test('should return first runtime for .py extension', () => {
      const runtime = getDefaultRuntimeForExtension('.py' as any);
      expect(runtime).toBe('python3.12');
    });

    test('should return first runtime for .go extension', () => {
      const runtime = getDefaultRuntimeForExtension('.go' as any);
      expect(runtime).toBe('provided.al2023');
    });

    test('should return first runtime for .java extension', () => {
      const runtime = getDefaultRuntimeForExtension('.java' as any);
      expect(runtime).toBe('java21' as any);
    });

    test('should always return the first element from the runtime array', () => {
      // This tests the behavior of selecting [0] from the array
      Object.keys(mockLambdaRuntimesForFileExtension).forEach((ext) => {
        const runtime = getDefaultRuntimeForExtension(ext as any);
        const expectedRuntime = mockLambdaRuntimesForFileExtension[ext][0];
        expect(runtime).toBe(expectedRuntime);
      });
    });

    test('should be consistent for same extension', () => {
      const runtime1 = getDefaultRuntimeForExtension('.ts' as any);
      const runtime2 = getDefaultRuntimeForExtension('.ts' as any);
      expect(runtime1).toBe(runtime2);
    });
  });
});
