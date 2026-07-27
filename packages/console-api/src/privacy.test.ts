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

/**
 * A source file that would fail every check below. Each check runs against it as well as against the
 * published files, so a check that stops matching anything — a mistyped escape, a pattern that no longer
 * compiles to what it reads like — fails here instead of passing silently for the rest of time.
 */
const SENTINEL = {
  file: 'sentinel.ts',
  text: `
    import type { PrismaClient } from '@prisma/client';
    import { publicProcedure } from '@trpc/server';
    export const endpoint = 'https://api.stacktape.com';
    export type CurrentUser = { keyPrefix: string; secretHash: string; pepper: string; signingKey: string };
    export declare const currentUser: PrismaClient;
    export declare const organizationMembers: unknown;
    export declare const inviteToOrganization: unknown;
    export declare const temporaryCredentials: unknown;
    export declare const reportSecretEvent: unknown;
    export declare const reportSsmParamEvent: unknown;
    export declare const deploymentStats: unknown;
    export declare const createAlarm: unknown;
    export declare const alertChannels: unknown;
    export declare const budgets: unknown;
    export declare const projectDetails: unknown;
    export declare const startAiGen: unknown;
    export declare const cuid: string;
    export declare const subscriptionPlanType: string;
    export declare const paddle: unknown;
    export declare const stripe: unknown;
    export declare const payload: GetPayload<JsonValue>;
    export * from '@generated/prisma/client';
  `
};

test('the package publishes the three external surfaces and nothing else', () => {
  assert.deepEqual(publishedSources.map(({ file }) => file).toSorted(), [
    'anonymous.ts',
    'api-key.ts',
    'aws-identity.ts'
  ]);
});

/**
 * Asserts that no published file matches any of the patterns, and that the sentinel matches every one of
 * them. The second half is what keeps the first half honest.
 */
const assertOnlyTheSentinelMatches = (patterns: RegExp[], why: string) => {
  for (const pattern of patterns) {
    for (const { file, text } of publishedSources) {
      assert.equal(pattern.test(text), false, `${file} matches ${pattern}, which ${why}`);
    }
    assert.equal(pattern.test(SENTINEL.text), true, `${pattern} no longer matches anything, so it proves nothing`);
  }
};

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

  assertOnlyTheSentinelMatches(
    privateProcedures.map((procedure) => new RegExp(String.raw`\b${procedure}\b`)),
    'names a private Console procedure'
  );
});

test('no database or ORM structure is described', () => {
  assertOnlyTheSentinelMatches(
    [
      /\bprisma\b/i,
      /\bPrismaClient\b/,
      /@generated\//,
      /\bGetPayload\b/,
      /\bJsonValue\b/,
      /\bcuid\b/i,
      /\bpaddle/i,
      /\bsubscriptionPlanType\b/,
      /\bstripe/i
    ],
    'describes internal structure'
  );
});

const foreignImports = ({ text }: { text: string }) =>
  [...text.matchAll(/from '([^']+)'/g)]
    .map((match) => match[1] ?? '')
    .filter((specifier) => specifier !== 'zod' && !specifier.startsWith('./'));

test('no server implementation is imported', () => {
  for (const source of publishedSources) {
    assert.deepEqual(foreignImports(source), [], `${source.file} imports something other than zod and its siblings`);
  }

  assert.deepEqual(
    foreignImports(SENTINEL),
    ['@prisma/client', '@trpc/server', '@generated/prisma/client'],
    'the import scan no longer sees imports it should reject'
  );

  assertOnlyTheSentinelMatches([/@trpc\/server/], 'pulls in the tRPC server runtime');
});

test('no credential value or internal endpoint is embedded', () => {
  assertOnlyTheSentinelMatches(
    [/https?:\/\/(?!example\.)/i, /\bsecretHash\b/, /\bkeyPrefix\b/, /\bpepper\b/i, /\bsigningKey/i],
    'is a credential name or an internal endpoint'
  );
});
