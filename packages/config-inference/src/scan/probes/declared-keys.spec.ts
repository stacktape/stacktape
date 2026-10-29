import { describe, expect, it } from 'bun:test';
import { emptyReview, notImportedGap, omitFor, reviewGaps, reviewKeys, safeDeclaredName } from './declared-keys';

describe('reviewKeys', () => {
  const rules = { Handler: 'carried', Description: 'ignored', Policies: 'not-carried', VpcConfig: 'network' } as const;

  it('reports every key the importer does not map, and leaves the declaration out for a sensitive one', () => {
    const review = reviewKeys(
      { Handler: 'h.handler', Description: 'x', Policies: [], VpcConfig: {}, Tracing: 'Active', 'x-extension': 1 },
      rules
    );
    expect(review).toEqual({
      omitted: [{ key: 'VpcConfig', concern: 'network' }],
      notCarried: ['Policies', 'Tracing']
    });
    expect(reviewGaps('template.yaml', 'ReadFunction', review)).toEqual([
      { file: 'template.yaml', object: 'ReadFunction', keys: ['VpcConfig'], effect: 'omitted', concern: 'network' }
    ]);
  });

  it('leaves out declarations with unknown keys when asked to, under a prefix', () => {
    const review = reviewKeys(
      { Path: '/', Unknown: true },
      { Path: 'carried' },
      { prefix: 'Properties.', unknown: 'omit' }
    );
    expect(review.omitted).toEqual([{ key: 'Properties.Unknown' }]);
  });

  it('writes a declaration without the keys it did not carry', () => {
    const review = reviewKeys({ Handler: 'h', Policies: [] }, rules);
    expect(reviewGaps('template.yaml', 'ReadFunction', review)).toEqual([
      { file: 'template.yaml', object: 'ReadFunction', keys: ['Policies'], effect: 'not-carried' }
    ]);
    expect(reviewGaps('template.yaml', 'ReadFunction', emptyReview())).toEqual([]);
    expect(reviewGaps('t.yaml', 'F', omitFor(emptyReview(), 'Timeout', 'execution'))[0]?.effect).toBe('omitted');
  });

  it('reduces repository-chosen names to a plain identifier shape', () => {
    expect(safeDeclaredName('Events.Daily Job"<b>')).toBe('Events.Daily_Job__b_');
    expect(notImportedGap('template.yaml', ['Role', 'Role', 'Logs'])).toEqual([
      { file: 'template.yaml', object: 'Resources', keys: ['Role', 'Logs'], effect: 'not-imported' }
    ]);
    expect(notImportedGap('template.yaml', [])).toEqual([]);
  });
});
