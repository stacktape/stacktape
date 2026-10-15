import assert from 'node:assert/strict';
import test from 'node:test';
import { recordStackOperationInputSchema } from './api-key.js';
import { reportIssueEventInputSchema } from './aws-identity.js';
import { sourceMapBundleSchema, sourceMapManifestSchema, sourceMapObjectKey } from './source-maps.js';

/** The wire contract between the CLI that stores source maps, the detector that dates an error, and the Console. */

const manifest = {
  functions: [
    {
      lambdaName: 'shop-dev-api',
      digest: 'd1',
      sourceMapKeys: [sourceMapObjectKey({ artifactName: 'api', digest: 'd1' }), 'source-maps/shared-layer-1/h1.json'],
      activeSince: 1_792_000_000_000
    }
  ]
};

test('an operation record carries the manifest, before and after the code switched', () => {
  const recorded = recordStackOperationInputSchema.parse({
    invocationId: 'inv-1',
    inProgress: true,
    sourceMaps: manifest
  });
  assert.deepEqual(recorded.sourceMaps, manifest);
  const { activeSince: _activeSince, ...beforeSwitch } = manifest.functions[0]!;
  assert.ok(sourceMapManifestSchema.safeParse({ functions: [beforeSwitch] }).success);
});

test('a manifest names only source-map objects of the deployment bucket', () => {
  for (const key of ['api/v000001-d1.zip', 'cf-template/v000001.yml', '../source-maps/a.json']) {
    const entry = { ...manifest.functions[0]!, sourceMapKeys: [key] };
    assert.equal(sourceMapManifestSchema.safeParse({ functions: [entry] }).success, false, key);
  }
});

test('reading a stored bundle keeps what mapping needs and drops the source text', () => {
  const parsed = sourceMapBundleSchema.parse({
    files: {
      '/var/task/index.js': {
        version: 3,
        sources: ['src/handler.ts'],
        sourcesContent: ['export const secret = "do not keep";'],
        mappings: 'AAAA',
        debugId: 'ABC'
      }
    }
  });
  assert.deepEqual(parsed.files['/var/task/index.js'], {
    version: 3,
    sources: ['src/handler.ts'],
    names: [],
    mappings: 'AAAA'
  });
});

test('an issue event dates its execution environment when the detector can, and older detectors still report', () => {
  const event = {
    fingerprint: 'fp',
    errorMessage: 'Error: bad order',
    errorType: 'uncaught',
    stackTrace: [{ function: 'handler', file: 'file:///var/task/index.js', line: 1, column: 120 }],
    project: 'shop',
    stage: 'dev',
    region: 'eu-west-1'
  };
  assert.equal(reportIssueEventInputSchema.parse(event).environmentStartedAt, undefined);
  assert.equal(
    reportIssueEventInputSchema.parse({ ...event, environmentStartedAt: 1_792_000_000_000 }).environmentStartedAt,
    1_792_000_000_000
  );
});
