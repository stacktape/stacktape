import assert from 'node:assert/strict';
import test from 'node:test';
import { describeFreshness, type FreshnessFacts } from './session-freshness.ts';

const current: FreshnessFacts = {
  branch: 'feat/example',
  isMainCheckout: false,
  dirtyFiles: 0,
  fetchFailed: false,
  aheadOfMain: 2,
  behindMain: 0,
  behindUpstream: 0
};

test('a current worktree produces a summary and no warnings', () => {
  const { summary, warnings } = describeFreshness(current);
  assert.match(summary, /a worktree, branch feat\/example, 0 behind and 2 ahead of origin\/main/);
  assert.deepEqual(warnings, []);
});

test('a stale shared main checkout warns against reading it as current code', () => {
  const { warnings } = describeFreshness({
    ...current,
    branch: 'main',
    isMainCheckout: true,
    behindMain: 1884,
    dirtyFiles: 133
  });
  assert.equal(warnings.length, 2);
  assert.match(String(warnings[0]), /1884 commits behind origin\/main\. Do not read it as current code/);
  assert.match(String(warnings[1]), /uncommitted files, possibly from another session/);
});

test('a stale feature branch is told to rebase before testing or opening a PR', () => {
  const { warnings } = describeFreshness({ ...current, behindMain: 40, behindUpstream: 3 });
  assert.match(String(warnings[0]), /40 commits behind origin\/main\. Check whether the work already landed/);
  assert.match(String(warnings[1]), /has 3 commits this checkout lacks/);
});

test('a failed fetch and a stale Console checkout are reported', () => {
  const { warnings } = describeFreshness({
    ...current,
    fetchFailed: true,
    console: { fetchFailed: false, matchesPointer: false, behindMain: 12 }
  });
  assert.match(String(warnings[0]), /Fetching origin failed/);
  assert.match(
    String(warnings[1]),
    /apps\/console is checked out away from its recorded pointer and is 12 commits behind/
  );
});

test('a Console checkout at its recorded pointer is not a warning', () => {
  const { warnings } = describeFreshness({
    ...current,
    console: { fetchFailed: false, matchesPointer: true, behindMain: 30 }
  });
  assert.deepEqual(warnings, []);
});
