import { describe, expect, test } from 'bun:test';
import { assertLogClassSupportsForwarding } from './log-groups';

describe('CloudWatch log classes', () => {
  test('rejects forwarding from an Infrequent Access group before synthesis', () => {
    expect(() =>
      assertLogClassSupportsForwarding({
        logClass: 'infrequent-access',
        logForwarding: { type: 'highlight', properties: { projectId: 'project' } }
      })
    ).toThrow('cannot be combined with log forwarding');

    expect(() =>
      assertLogClassSupportsForwarding({
        logClass: 'standard',
        logForwarding: { type: 'highlight', properties: { projectId: 'project' } }
      })
    ).not.toThrow();
  });
});
