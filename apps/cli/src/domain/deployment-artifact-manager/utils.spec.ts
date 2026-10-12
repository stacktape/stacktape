import { describe, expect, test } from 'bun:test';
import { parseBucketObjectS3Key } from './utils';

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
