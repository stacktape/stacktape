import { describe, expect, it } from 'bun:test';
import { blockedTargetCopy, stackStatusWords } from './target-copy';

const blocked = (
  reason: 'foreign-stack' | 'identity-mismatch' | 'unsafe-status' | 'incomplete-stack-data',
  stackStatus?: string
) => ({
  status: 'blocked' as const,
  accountId: '123456789012',
  stackName: 'shop-dev',
  projectName: 'shop',
  stage: 'dev',
  region: 'eu-west-1',
  reason,
  ...(stackStatus === undefined ? {} : { stackStatus })
});

describe('a blocked deploy target', () => {
  it.each([
    ['unsafe-status', 'ROLLBACK_COMPLETE', 'A failed first deploy left this stack behind', 'delete'],
    ['unsafe-status', 'CREATE_FAILED', 'A failed first deploy left this stack behind', 'delete'],
    ['unsafe-status', 'DELETE_FAILED', 'An earlier delete of this stack did not finish', 'delete'],
    ['unsafe-status', 'DELETE_IN_PROGRESS', 'AWS is still removing this stack', undefined],
    ['unsafe-status', 'UPDATE_IN_PROGRESS', 'Another change to this stack is still running', undefined],
    ['unsafe-status', 'UPDATE_ROLLBACK_FAILED', 'This stack is stuck after a failed update', 'rollback'],
    ['foreign-stack', 'CREATE_COMPLETE', 'Another tool owns a stack with this name', undefined],
    ['identity-mismatch', 'UPDATE_COMPLETE', 'This stack belongs to another project or stage', undefined],
    ['incomplete-stack-data', undefined, 'AWS did not fully describe this stack', undefined]
  ] as const)('%s %s reads "%s"', (reason, status, title, fix) => {
    const copy = blockedTargetCopy(blocked(reason, status));
    expect(copy.title).toBe(title);
    // Deleting is offered only where it is the fix, never for a stack that may hold a working app.
    expect(copy.fix).toBe(fix);
    expect(copy.body).not.toMatch(/foreign|mismatch|StackId/);
  });

  it('names a state it has no words for rather than hiding it', () => {
    expect(blockedTargetCopy(blocked('unsafe-status', 'REVIEW_IN_PROGRESS')).title).toBe(
      'Another change to this stack is still running'
    );
    expect(blockedTargetCopy(blocked('unsafe-status', 'SOME_FUTURE_STATE')).body).toContain('SOME_FUTURE_STATE');
  });
});

describe('an updateable stack', () => {
  it('says what happened to it last, in words', () => {
    expect(stackStatusWords('UPDATE_COMPLETE')).toBe('its last update finished');
    expect(stackStatusWords('UPDATE_ROLLBACK_COMPLETE')).toBe('its last update failed and was rolled back');
    expect(stackStatusWords('SOMETHING_NEW')).toBe('its status is SOMETHING_NEW');
  });
});
