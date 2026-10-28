import { describe, expect, test } from 'bun:test';
import { getPlannedResources } from './progress-plan';

const noChanges = { created: [], updated: [], deleted: [] };

describe('getPlannedResources', () => {
  test('a create or delete without resource names counts every resource CloudFormation reports', () => {
    expect(getPlannedResources({ changeLists: noChanges })).toBeUndefined();
    expect(getPlannedResources({ updatedResourceLogicalNames: [], changeLists: noChanges })).toBeUndefined();
  });

  test('an update counts the resources its template diff changes', () => {
    expect(
      getPlannedResources({ changeLists: { created: ['Queue'], updated: ['Function'], deleted: ['OldTopic'] } })
    ).toEqual(new Set(['Queue', 'Function', 'OldTopic']));
    expect(getPlannedResources({ updatedResourceLogicalNames: ['Function'], changeLists: noChanges })).toEqual(
      new Set(['Function'])
    );
  });
});
