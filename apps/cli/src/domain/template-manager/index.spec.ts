import { describe, expect, test } from 'bun:test';
import { TemplateManager } from './index';

describe('TemplateManager stack outputs', () => {
  test('allows Stacktape-managed outputs to be refreshed', () => {
    const manager = new TemplateManager();

    manager.addStackOutput({
      cfOutputName: 'StpStackInfoMap',
      value: { metadata: { first: true }, resources: {}, customOutputs: {} } as any,
      overwriteExisting: true
    });

    expect(() => {
      manager.addStackOutput({
        cfOutputName: 'StpStackInfoMap',
        value: { metadata: { second: true }, resources: {}, customOutputs: {} } as any,
        overwriteExisting: true
      });
    }).not.toThrow();

    expect(manager.template.Outputs.StpStackInfoMap.Value).toEqual({
      metadata: { second: true },
      resources: {},
      customOutputs: {}
    });
  });

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
    }).toThrow(/already exists with different value/);
  });
});
