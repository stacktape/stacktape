import { describe, expect, it } from 'bun:test';
import { REAL_PROJECT_CORPUS } from './init-real-project-corpus-cases';

describe('the pinned real-project init corpus', () => {
  it('uses immutable, uniquely identified GitHub inputs', () => {
    expect(REAL_PROJECT_CORPUS.length).toBeGreaterThanOrEqual(19);
    expect(new Set(REAL_PROJECT_CORPUS.map((entry) => entry.id)).size).toBe(REAL_PROJECT_CORPUS.length);
    expect(
      new Set(REAL_PROJECT_CORPUS.map((entry) => `${entry.repository}#${entry.commit}:${entry.subdirectory ?? '.'}`))
        .size
    ).toBe(REAL_PROJECT_CORPUS.length);

    for (const corpusCase of REAL_PROJECT_CORPUS) {
      expect(corpusCase.repository).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+\.git$/);
      expect(corpusCase.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(corpusCase.exercises.length).toBeGreaterThan(0);
    }
  });

  it('defines a meaningful semantic release contract for every project', () => {
    for (const corpusCase of REAL_PROJECT_CORPUS) {
      const expectation = corpusCase.expect;
      expect(Object.keys(expectation.resourceTypes).length).toBeGreaterThan(0);
      expect(Object.values(expectation.resourceTypes).every((count) => Number.isInteger(count) && count > 0)).toBe(
        true
      );
      expect(Number.isInteger(expectation.serviceCount) && expectation.serviceCount >= 0).toBe(true);
      expect(Number.isInteger(expectation.httpServiceCount) && expectation.httpServiceCount >= 0).toBe(true);
      expect(expectation.httpServiceCount).toBeLessThanOrEqual(expectation.serviceCount);
      expect(expectation.forbidCurrentlyHostedDependencies).toBe(true);

      for (const pattern of [...(expectation.requiredGapPatterns ?? []), ...(expectation.forbiddenGapPatterns ?? [])]) {
        expect(() => new RegExp(pattern, 'i')).not.toThrow();
      }
      for (const required of expectation.requiredConfig ?? []) {
        expect(expectation.forbiddenConfig ?? []).not.toContain(required);
      }
    }
  });
});
