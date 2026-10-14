import { describe, expect, test } from 'bun:test';
import { TemplateManager } from './index';

describe('TemplateManager stack outputs', () => {
  test('still rejects conflicting user-defined outputs', () => {
    const manager = new TemplateManager();

    manager.addStackOutput({
      cfOutputName: 'MyOutput',
      value: { first: true } as any
    });

    expect(() => {
      manager.addStackOutput({
        cfOutputName: 'MyOutput',
        value: { second: true } as any
      });
    }).toThrow(/already exists with a different value/);
  });
});
