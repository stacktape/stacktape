import { describe, expect, it } from 'bun:test';
import { SYNTHETIC_PROJECT_EXPECTATIONS } from './init-synthetic-project-corpus-expectations';

describe('the full synthetic project corpus contracts', () => {
  it('covers all 25 independently generated applications', () => {
    expect(Object.keys(SYNTHETIC_PROJECT_EXPECTATIONS)).toHaveLength(25);
  });

  it('uses unique service identities and positive resource counts', () => {
    for (const [id, expectation] of Object.entries(SYNTHETIC_PROJECT_EXPECTATIONS)) {
      expect(new Set(expectation.services).size, `${id} service names`).toBe(expectation.services.length);
      expect(
        expectation.httpServices.every((name) => expectation.services.includes(name)),
        `${id} HTTP services`
      ).toBe(true);
      expect(
        Object.values(expectation.resources).every((count) => Number.isInteger(count) && count > 0),
        `${id} resource counts`
      ).toBe(true);
    }
  });

  it('allows zero resources only for explicit unsupported-runtime contracts', () => {
    expect(
      Object.entries(SYNTHETIC_PROJECT_EXPECTATIONS)
        .filter(([, expectation]) => Object.keys(expectation.resources).length === 0)
        .map(([id]) => id)
        .sort()
    ).toEqual(['cloudflare-workers-saas', 'pulumi-typescript-serverless']);
  });
});
