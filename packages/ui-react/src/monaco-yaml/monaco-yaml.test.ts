import { describe, expect, test } from 'bun:test';
import type { MonacoEditor } from 'monaco-types';
import { shouldIgnoreYamlDiagnostic, withLegacyWebWorkerOptions } from './monaco-yaml.js';

describe('Stacktape YAML diagnostics', () => {
  test('ignores values intentionally understood by Stacktape rather than JSON Schema', () => {
    expect(shouldIgnoreYamlDiagnostic('$Secret("database-password")')).toBeTrue();
    expect(shouldIgnoreYamlDiagnostic('$ResourceParam("api", "url").hostname')).toBeTrue();
  });

  test('keeps ordinary schema and syntax errors visible', () => {
    expect(shouldIgnoreYamlDiagnostic('not-a-valid-resource-type')).toBeFalse();
    expect(shouldIgnoreYamlDiagnostic('$not a directive')).toBeFalse();
  });
});

describe('YAML worker start-up on Monaco 0.56', () => {
  test('starts the labelled worker with its create data before handing it to Monaco', async () => {
    const messages: unknown[] = [];
    const worker = { postMessage: (message: unknown) => messages.push(message) };
    const labels: string[] = [];
    const previousEnvironment = globalThis.MonacoEnvironment;
    globalThis.MonacoEnvironment = {
      getWorker: (_id: string, label: string) => {
        labels.push(label);
        return worker as unknown as Worker;
      }
    };
    const received: Array<{ worker: Promise<unknown> }> = [];
    const monaco = { editor: { createWebWorker: (options: { worker: Promise<unknown> }) => received.push(options) } };

    const adapted = withLegacyWebWorkerOptions(monaco as unknown as MonacoEditor);
    adapted.editor.createWebWorker({ label: 'yaml', createData: { schemas: [] } } as never);

    expect(labels).toEqual(['yaml']);
    expect(await received[0]!.worker).toBe(worker);
    expect(messages).toEqual(['ignore', { schemas: [] }]);
    globalThis.MonacoEnvironment = previousEnvironment;
  });

  test('passes calls in the current shape through unchanged', () => {
    const options = { worker: Promise.resolve({}) };
    const received: unknown[] = [];
    const monaco = { editor: { createWebWorker: (given: unknown) => received.push(given) } };
    withLegacyWebWorkerOptions(monaco as unknown as MonacoEditor).editor.createWebWorker(options as never);
    expect(received).toEqual([options]);
  });
});
