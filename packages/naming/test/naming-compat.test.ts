import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { awsResourceNames } from '../src/aws-resource-names.ts';
import { cfLogicalNames } from '../src/logical-names.ts';
import { buildResourceName, buildResourceNameInfo } from '../src/names.ts';

type FixtureCase = { readonly args: readonly unknown[]; readonly expected: unknown };
type FixtureMap = Readonly<Record<string, FixtureCase>>;

const fixturePath = fileURLToPath(new URL('fixtures/legacy-17aef681.json', import.meta.url));
const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as {
  readonly source: { readonly legacyCommit: string; readonly classification: string };
  readonly logicalNames: FixtureMap;
  readonly physicalNames: FixtureMap;
};

const replay = (functions: object, cases: FixtureMap): void => {
  assert.deepEqual(Object.keys(cases).toSorted(), Object.keys(functions).toSorted());
  for (const [name, fixtureCase] of Object.entries(cases)) {
    const fn = Object.getOwnPropertyDescriptor(functions, name)?.value as (...args: never[]) => unknown;
    assert.deepEqual(fn.apply(functions, fixtureCase.args as never[]), fixtureCase.expected, name);
  }
};

test('replays every legacy logical-name fixture', () => {
  assert.equal(fixture.source.legacyCommit, '17aef681');
  assert.equal(fixture.source.classification, 'must-preserve');
  replay(cfLogicalNames, fixture.logicalNames);
});

test('replays every legacy physical-name fixture', () => {
  replay(awsResourceNames, fixture.physicalNames);
});

test('resource-name truncation is deterministic and keeps the exact legacy suffix', () => {
  const proposedResourceName = 'a'.repeat(65);
  assert.equal(buildResourceName({ proposedResourceName, lengthLimit: 64 }), `${'a'.repeat(57)}-df3b2b`);
  assert.deepEqual(buildResourceNameInfo({ proposedResourceName, lengthLimit: 64 }), {
    name: `${'a'.repeat(57)}-df3b2b`,
    truncated: true
  });
  assert.equal(buildResourceName({ proposedResourceName, lengthLimit: 65 }), proposedResourceName);
});

test('nearby overlong inputs do not collide and repeated inputs are stable', () => {
  const inputs = [
    'orders-worker-' + 'a'.repeat(80),
    'orders-worker-' + 'b'.repeat(80),
    'orders-worker-' + 'a'.repeat(79) + 'b'
  ];
  const firstPass = inputs.map((proposedResourceName) => buildResourceName({ proposedResourceName, lengthLimit: 40 }));
  const secondPass = inputs.map((proposedResourceName) => buildResourceName({ proposedResourceName, lengthLimit: 40 }));
  assert.deepEqual(secondPass, firstPass);
  assert.equal(new Set(firstPass).size, inputs.length);
  assert.ok(firstPass.every((name) => name.length === 40));
});

test('logical IDs preserve punctuation, unicode, numeric-word, and domain boundaries', () => {
  assert.equal(cfLogicalNames.bucket('orders.api_v2'), 'OrdersApiV2Bucket');
  assert.equal(cfLogicalNames.bucket('Žluťoučký-kůň'), 'ŽluťoučkýKůňBucket');
  assert.equal(cfLogicalNames.dnsRecord('api.preview.example.com'), 'StpApiPreviewExampleComRecordSet');
  assert.equal(
    cfLogicalNames.dnsRecord(
      'this-is-a-very-long-subdomain-name-with-many-segments.and-another-very-long-segment.example.com'
    ),
    'StpThisIsAVeryLongSubdomainNameWithManySegmentsAndAnotherVeryLongSegmentExampleComRecordSet'
  );
});

test('physical names preserve legacy unicode, punctuation, and case behavior', () => {
  assert.equal(awsResourceNames.bucket('Üploads.!', 'Billing-Prod', 'abc123'), 'Billing-Prod-üploads.!-abc123');
});

test('empty strings retain legacy output rather than being silently rejected', () => {
  assert.equal(buildResourceName({ proposedResourceName: '', lengthLimit: 1 }), '');
  assert.equal(buildResourceName({ proposedResourceName: 'abc', lengthLimit: 0 }), 'abc');
  assert.equal(buildResourceName({ proposedResourceName: 'abc', lengthLimit: 1 }), '-483366');
  assert.equal(cfLogicalNames.bucket(''), 'Bucket');
  assert.equal(awsResourceNames.sqsQueue('', '', false), '-');
});
