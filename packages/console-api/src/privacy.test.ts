import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

/**
 * This package is the only Console API description that ships outside the private repository, so what it
 * does not say matters as much as what it does. These checks read the published sources directly: a type
 * test can only prove things about types that are named, and the risk here is a name appearing at all.
 */

const sourceDirectory = dirname(fileURLToPath(import.meta.url));

const publishedSources = readdirSync(sourceDirectory)
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.type-test.ts'))
  .map((file) => ({ file, text: readFileSync(join(sourceDirectory, file), 'utf8') }));

test('the package publishes the three external surfaces and nothing else', () => {
  assert.deepEqual(publishedSources.map(({ file }) => file).toSorted(), [
    'anonymous.ts',
    'api-key.ts',
    'aws-identity.ts'
  ]);
});

test('no private Console session procedure is named', () => {
  // Procedures only a signed-in Console user may call. Naming one here would tell a reader of the public
  // package that it exists, and invite a public client to try it.
  const privateProcedures = [
    'currentUser',
    'organizationMembers',
    'inviteToOrganization',
    'temporaryCredentials',
    'reportSecretEvent',
    'reportSsmParamEvent',
    'deploymentStats',
    'createAlarm',
    'alertChannels',
    'budgets',
    'projectDetails',
    'startAiGen'
  ];

  for (const { file, text } of publishedSources) {
    for (const procedure of privateProcedures) {
      assert.equal(
        new RegExp(`\b${procedure}\b`).test(text),
        false,
        `${file} names the private Console procedure ${procedure}`
      );
    }
  }
});

test('no database or ORM structure is described', () => {
  const forbidden = [
    /\bprisma\b/i,
    /\bPrismaClient\b/,
    /@generated\//,
    /\bGetPayload\b/,
    /\bJsonValue\b/,
    /\bcuid\b/i,
    /\bpaddle/i,
    /\bsubscriptionPlanType\b/,
    /\bstripe/i
  ];

  for (const { file, text } of publishedSources) {
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${file} matches ${pattern}, which describes internal structure`);
    }
  }
});

test('no server implementation is imported', () => {
  for (const { file, text } of publishedSources) {
    const imports = [...text.matchAll(/from '([^']+)'/g)].map((match) => match[1] ?? '');
    assert.deepEqual(
      imports.filter((specifier) => specifier !== 'zod' && !specifier.startsWith('./')),
      [],
      `${file} imports something other than zod and its siblings`
    );
    assert.equal(/@trpc\/server/.test(text), false, `${file} pulls in the tRPC server runtime`);
  }
});

test('no credential value or internal endpoint is embedded', () => {
  const forbidden = [/https?:\/\/(?!example\.)/i, /\bsecretHash\b/, /\bkeyPrefix\b/, /\bpepper\b/i, /\bsigningKey/i];

  for (const { file, text } of publishedSources) {
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${file} matches ${pattern}`);
    }
  }
});
