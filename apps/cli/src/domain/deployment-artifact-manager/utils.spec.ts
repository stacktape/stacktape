import { describe, expect, test } from 'bun:test';
import { parseBucketObjectS3Key, shouldRedeployStoredFunctionCode } from './utils';

describe('deployment bucket object keys', () => {
  test.each([
    [
      'handler/v000012-3afb328ad9f1af48c1909259a5242b4a17831362.zip',
      { name: 'handler', version: 'v000012', digest: '3afb328ad9f1af48c1909259a5242b4a17831362', extension: 'zip' }
    ],
    ['cf-template/v000012.yml', { name: 'cf-template', version: 'v000012', digest: null, extension: 'yml' }],
    [
      'stacktapeServiceLambda/v000001-72193637609d4491cfa4fe2748715f8dbf374ccf.zip',
      {
        name: 'stacktapeServiceLambda',
        version: 'v000001',
        digest: '72193637609d4491cfa4fe2748715f8dbf374ccf',
        extension: 'zip'
      }
    ]
  ])('%s is an artifact', (key, expected) => {
    expect(parseBucketObjectS3Key(key)).toEqual(expected);
  });

  // A deployment once crashed on the next deploy because a hand-placed object sat at the bucket root.
  test.each(['probe-state', 'notes.txt', 'handler/', 'a/b/c.zip', ''])(
    '%s is not an artifact and is ignored',
    (key) => {
      expect(parseBucketObjectS3Key(key)).toBeUndefined();
    }
  );
});

// Review of #369: a dev stack update must not leave a function the session skips on code that is not its source. The
// dev stack was built from f v1 (key K1, digest D1); a session deployed f v2 directly; the source went back to v1; a
// session started with `--resources g` skips f, and the dev stack update builds D1 again, which K1 already holds.
describe('redeploying stored function code', () => {
  test.each([
    // Deploys: code a fast deployment changed is redeployed, code that matches is left alone.
    [{ devStack: false, inDevSession: true, runsOtherCode: true }, true],
    [{ devStack: false, inDevSession: true, runsOtherCode: false }, false],
    // A function the dev session runs gets its code from the session right after the stack.
    [{ devStack: true, inDevSession: true, runsOtherCode: true }, false],
    // A function the dev session skips runs whatever CloudFormation deployed last: f gets v1 again.
    [{ devStack: true, inDevSession: false, runsOtherCode: true }, true],
    [{ devStack: true, inDevSession: false, runsOtherCode: false }, false]
  ])('%o redeploys: %p', ({ devStack, inDevSession, runsOtherCode }, expected) => {
    expect(shouldRedeployStoredFunctionCode({ devStack, inDevSession, runsOtherCode: () => runsOtherCode })).toBe(
      expected
    );
  });
});
