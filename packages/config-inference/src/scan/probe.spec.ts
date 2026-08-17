import { describe, expect, it } from 'bun:test';
import { citeFirstMatchOnly } from './probe';

describe('citeFirstMatchOnly', () => {
  it('cites a declaration without copying unrelated values from the same line', () => {
    const citation = citeFirstMatchOnly(
      'stack.ts',
      'const fn = new lambda.Function(this, "Api", { environment: { TOKEN: "must-not-travel" } });',
      /new\s+lambda\.Function\s*\(/
    );

    expect(citation).toEqual({ file: 'stack.ts', line: 1, quote: 'new lambda.Function(' });
    expect(JSON.stringify(citation)).not.toContain('must-not-travel');
  });
});
