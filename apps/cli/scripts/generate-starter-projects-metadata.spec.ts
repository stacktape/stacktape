import { describe, expect, test } from 'bun:test';
import { compareStarterProjectMetadata } from './generate-starter-projects-metadata';

describe('starter project metadata ordering', () => {
  test('uses the project id to stabilize equal priorities regardless of input order', () => {
    const projects = [
      { priority: 10, starterProjectId: 'zeta' },
      { priority: 5, starterProjectId: 'middle' },
      { priority: 10, starterProjectId: 'alpha' }
    ];

    expect([...projects].sort(compareStarterProjectMetadata).map(({ starterProjectId }) => starterProjectId)).toEqual([
      'middle',
      'alpha',
      'zeta'
    ]);
    expect(
      [...projects]
        .reverse()
        .sort(compareStarterProjectMetadata)
        .map(({ starterProjectId }) => starterProjectId)
    ).toEqual(['middle', 'alpha', 'zeta']);
  });
});
