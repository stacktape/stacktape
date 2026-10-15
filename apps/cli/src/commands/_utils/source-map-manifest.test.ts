import { describe, expect, test } from 'bun:test';
import { getPublishedVersionOfLatest } from './source-map-manifest';

/** The alias and versions Lambda reports, as the activation record reads them. */
const lambdaWith = (aliasVersion: string, versions: Record<string, { CodeSha256: string; LastModified: string }>) => ({
  getAlias: async () => ({ FunctionVersion: aliasVersion }),
  getFunction: async ({ qualifier }: { qualifier?: string }) => versions[qualifier!]!
});
const latest = { CodeSha256: 'code-b', LastModified: '2026-10-15T22:17:19.000+0000' };

describe('the published version an alias serves', () => {
  test('counts when it was published from the code $LATEST runs now', async () => {
    const lambda = lambdaWith('8', { 8: { ...latest } }) as never;
    expect(await getPublishedVersionOfLatest({ lambdaName: 'api', aliasName: 'stp', latest, lambda })).toBe('8');
  });

  test.each([
    [
      'other code: publication failed and the alias still serves A',
      { CodeSha256: 'code-a', LastModified: '2026-10-15T22:17:00.908+0000' }
    ],
    [
      'the same bytes published from an earlier $LATEST, whose maps may differ',
      { CodeSha256: 'code-b', LastModified: '2026-10-15T22:17:00.908+0000' }
    ]
  ])('does not count for %s', async (_case, version7) => {
    const lambda = lambdaWith('7', { 7: version7 }) as never;
    expect(await getPublishedVersionOfLatest({ lambdaName: 'api', aliasName: 'stp', latest, lambda })).toBeUndefined();
  });

  test('a read error gives no version', async () => {
    const lambda = {
      getAlias: async () => {
        throw new Error('AccessDenied');
      },
      getFunction: async () => ({})
    } as never;
    expect(await getPublishedVersionOfLatest({ lambdaName: 'api', aliasName: 'stp', latest, lambda })).toBeUndefined();
  });
});
