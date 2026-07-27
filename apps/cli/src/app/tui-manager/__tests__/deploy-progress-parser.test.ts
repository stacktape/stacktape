import { describe, test, expect } from 'bun:test';
import {
  parseEstimatePercent,
  getProgressPercent,
  parseResourceState,
  parseProgressCounts,
  parseSummaryCounts,
  parseDetailLists,
  parseStatusText,
  isCleanupPhase,
  formatListSummary
} from '../deploy-progress-parser';

describe('parseEstimatePercent', () => {
  test('parses normal estimate', () => {
    expect(parseEstimatePercent('Estimate: ~85%')).toBe(85);
  });

  test('parses less-than estimate as 1', () => {
    expect(parseEstimatePercent('Estimate: ~<1%')).toBe(1);
  });

  test('returns null for no estimate', () => {
    expect(parseEstimatePercent('No estimate here')).toBeNull();
  });

  test('returns null for undefined', () => {
    expect(parseEstimatePercent(undefined)).toBeNull();
  });

  test('parses 100%', () => {
    expect(parseEstimatePercent('Estimate: ~100%')).toBe(100);
  });

  test('parses 0%', () => {
    expect(parseEstimatePercent('Estimate: ~0%')).toBe(0);
  });
});

describe('getProgressPercent', () => {
  test('returns estimate when running', () => {
    expect(getProgressPercent(75, 'running')).toBe(75);
  });

  test('returns 100 when not running', () => {
    expect(getProgressPercent(75, 'success')).toBe(100);
    expect(getProgressPercent(50, 'error')).toBe(100);
  });

  test('returns null when no estimate and running', () => {
    expect(getProgressPercent(null, 'running')).toBeNull();
  });

  test('clamps to 0-100 range', () => {
    expect(getProgressPercent(-10, 'running')).toBe(0);
    expect(getProgressPercent(150, 'running')).toBe(100);
  });
});

describe('parseResourceState', () => {
  test('parses active resources', () => {
    const result = parseResourceState('Currently updating: MyLambda, MyApi.');
    expect(result.active).toBe('MyLambda, MyApi');
  });

  test('parses waiting resources', () => {
    const result = parseResourceState('Waiting: MyBucket, MyQueue.');
    expect(result.waiting).toBe('MyBucket, MyQueue');
  });

  test('parses both active and waiting', () => {
    const result = parseResourceState('Currently updating: MyLambda. Waiting: MyBucket.');
    expect(result.active).toBe('MyLambda');
    expect(result.waiting).toBe('MyBucket');
  });

  test('returns null for no matches', () => {
    const result = parseResourceState('No resource info');
    expect(result.active).toBeNull();
    expect(result.waiting).toBeNull();
  });

  test('handles undefined', () => {
    const result = parseResourceState(undefined);
    expect(result.active).toBeNull();
    expect(result.waiting).toBeNull();
  });
});

describe('parseProgressCounts', () => {
  test('parses progress counts', () => {
    const result = parseProgressCounts('Progress: 3/25');
    expect(result.done).toBe(3);
    expect(result.total).toBe(25);
  });

  test('returns null for no match', () => {
    const result = parseProgressCounts('No progress');
    expect(result.done).toBeNull();
    expect(result.total).toBeNull();
  });

  test('handles 0/0', () => {
    const result = parseProgressCounts('Progress: 0/0');
    expect(result.done).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe('parseSummaryCounts', () => {
  test('parses summary counts', () => {
    const result = parseSummaryCounts('Summary: created=2 updated=25 deleted=0');
    expect(result.created).toBe(2);
    expect(result.updated).toBe(25);
    expect(result.deleted).toBe(0);
  });

  test('returns zeros for no match', () => {
    const result = parseSummaryCounts('No summary');
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
  });

  test('handles undefined', () => {
    const result = parseSummaryCounts(undefined);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
  });
});

describe('parseDetailLists', () => {
  test('parses detail lists', () => {
    const result = parseDetailLists('Details: created=ResA, ResB; updated=ResC; deleted=none.');
    expect(result.created).toBe('ResA, ResB');
    expect(result.updated).toBe('ResC');
    expect(result.deleted).toBe('none');
  });

  test('returns null for no match', () => {
    const result = parseDetailLists('No details');
    expect(result.created).toBeNull();
    expect(result.updated).toBeNull();
    expect(result.deleted).toBeNull();
  });
});

describe('parseStatusText', () => {
  test('parses updating status', () => {
    expect(parseStatusText('Status: Updating resources. Progress: 3/25')).toBe('Updating resources');
  });

  test('parses creating status', () => {
    expect(parseStatusText('Status: Creating resources.')).toBe('Creating resources');
  });

  test('parses deleting status', () => {
    expect(parseStatusText('Status: Deleting resources.')).toBe('Deleting resources');
  });

  test('parses cleanup status', () => {
    expect(parseStatusText('Status: Cleaning up. Removing 2 old resources.')).toBe('Cleaning up');
  });

  test('parses finalizing status', () => {
    expect(parseStatusText('Status: Finalizing stack operation.')).toBe('Finalizing stack operation');
  });

  test('returns null for no status', () => {
    expect(parseStatusText('No status here')).toBeNull();
  });

  test('returns null for undefined', () => {
    expect(parseStatusText(undefined)).toBeNull();
  });
});

describe('isCleanupPhase', () => {
  test('detects cleanup phase', () => {
    expect(isCleanupPhase('Status: Cleaning up. Removing 2 old resources.')).toBe(true);
  });

  test('returns false for non-cleanup', () => {
    expect(isCleanupPhase('Status: Updating resources.')).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isCleanupPhase(undefined)).toBe(false);
  });

  test('returns false for no status', () => {
    expect(isCleanupPhase('No status')).toBe(false);
  });
});

describe('formatListSummary', () => {
  test('formats list with items within limit', () => {
    expect(formatListSummary('ResA, ResB, ResC', 3, 4)).toBe('ResA, ResB, ResC');
  });

  test('truncates with ellipsis when over limit', () => {
    expect(formatListSummary('ResA, ResB, ResC, ResD, ResE', 5, 3)).toBe('ResA, ResB, ResC, ...');
  });

  test('returns ellipsis for "none"', () => {
    expect(formatListSummary('none', 1, 4)).toBe('...');
  });

  test('returns null for count 0', () => {
    expect(formatListSummary('ResA', 0, 4)).toBeNull();
  });

  test('returns null for empty items', () => {
    expect(formatListSummary(null, 1, 4)).toBe('...');
  });

  test('adds ellipsis when count exceeds listed items', () => {
    expect(formatListSummary('ResA, ResB', 5, 4)).toBe('ResA, ResB, ...');
  });
});

describe('full progress message parsing', () => {
  const activeMessage =
    'Status: Updating resources. Progress: 3/25. Currently updating: MyLambda, MyApi, MyQueue. Waiting: MyBucket, MyTable, MyRole. Estimate: ~45%. Creating: 2 (ResA, ResB). Updating: 23 (ResC, ResD, ResE, +20). Summary: created=2 updated=23 deleted=0 Details: created=ResA, ResB; updated=ResC, ResD, ResE; deleted=none.';

  test('parses all fields from realistic active message', () => {
    expect(parseStatusText(activeMessage)).toBe('Updating resources');
    expect(parseProgressCounts(activeMessage)).toEqual({ done: 3, total: 25 });
    expect(parseResourceState(activeMessage).active).toBe('MyLambda, MyApi, MyQueue');
    expect(parseResourceState(activeMessage).waiting).toBe('MyBucket, MyTable, MyRole');
    expect(parseEstimatePercent(activeMessage)).toBe(45);
    expect(parseSummaryCounts(activeMessage)).toEqual({ created: 2, updated: 23, deleted: 0 });
    expect(isCleanupPhase(activeMessage)).toBe(false);
  });

  const cleanupMessage =
    'Status: Cleaning up. Removing 2 old resources. Removed: 1. Estimate: ~100% Summary: created=2 updated=23 deleted=0 Details: created=ResA, ResB; updated=ResC; deleted=none.';

  test('parses cleanup phase message', () => {
    expect(isCleanupPhase(cleanupMessage)).toBe(true);
    expect(parseStatusText(cleanupMessage)).toBe('Cleaning up');
    expect(parseSummaryCounts(cleanupMessage)).toEqual({ created: 2, updated: 23, deleted: 0 });
  });

  test('planned counts (parseSummaryCounts) are static — same throughout deployment', () => {
    // Verify that early and late messages have the same summary counts
    // This is the root cause of the "Done Updated 25" bug:
    // Summary counts come from template diff, not from actual completed operations
    const earlyMessage =
      'Status: Starting update. Progress: 0/25. Estimate: ~<1% Summary: created=0 updated=25 deleted=0 Details: created=none; updated=Res1, Res2, Res3; deleted=none.';
    const lateMessage =
      'Status: Updating resources. Progress: 20/25. Estimate: ~85% Summary: created=0 updated=25 deleted=0 Details: created=none; updated=Res1, Res2, Res3; deleted=none.';

    const earlySummary = parseSummaryCounts(earlyMessage);
    const lateSummary = parseSummaryCounts(lateMessage);

    // Both report updated=25 even though only 20/25 resources are done
    expect(earlySummary).toEqual(lateSummary);
    expect(earlySummary.updated).toBe(25);

    // But parseProgressCounts correctly shows actual progress
    expect(parseProgressCounts(earlyMessage)).toEqual({ done: 0, total: 25 });
    expect(parseProgressCounts(lateMessage)).toEqual({ done: 20, total: 25 });
  });
});
