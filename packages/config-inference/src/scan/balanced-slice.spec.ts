import { describe, expect, it } from 'bun:test';
import { sliceBalancedBraces } from './balanced-slice';

describe('sliceBalancedBraces', () => {
  it('ignores braces in strings and comments', () => {
    const source = [
      'new Thing({',
      '  command: "echo }",',
      "  opening: '{',",
      '  // } is documentation, not syntax',
      '  nested: { value: true }, /* { still a comment } */',
      '  final: "kept"',
      '});',
      'new Other({ wrong: true });'
    ].join('\n');
    const opening = source.indexOf('{');

    const slice = sliceBalancedBraces(source, opening);

    expect(slice?.body).toContain('final: "kept"');
    expect(slice?.body).not.toContain('wrong: true');
  });

  it('balances template expressions without treating template text as code', () => {
    const source = 'new Thing({ value: `literal } ${condition ? { ok: true } : { ok: false }}`, final: 1 });';

    const slice = sliceBalancedBraces(source, source.indexOf('{'));

    expect(slice?.body).toContain('final: 1');
  });

  it('returns nothing for an unfinished object', () => {
    expect(sliceBalancedBraces('{ value: true', 0)).toBeUndefined();
  });
});
