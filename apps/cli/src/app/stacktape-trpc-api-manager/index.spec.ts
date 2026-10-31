import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCliPackagingError } from '@domain-services/packaging-manager/errors';
import { createEsBundle } from '@stacktape/packaging/bundlers/es';
import { CliError } from '@utils/errors';
import { TRPCClientError } from '@trpc/client';

import { stacktapeTrpcApiManager, translateStacktapeApiError } from './index';
import { recordStackOperationEnd } from './operation-recording';

const trpcError = (code: 'FORBIDDEN' | 'UNAUTHORIZED', message: string) =>
  TRPCClientError.from({
    error: {
      code: code === 'FORBIDDEN' ? -32_003 : -32_001,
      message,
      data: {
        code,
        httpStatus: code === 'FORBIDDEN' ? 403 : 401,
        path: 'canDeploy'
      }
    }
  });

describe('Stacktape API error translation', () => {
  test.each([
    {
      source: trpcError('UNAUTHORIZED', 'API key has been revoked'),
      hasApiKey: true,
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_REVOKED',
      message: 'API key has been revoked.'
    },
    {
      source: trpcError('UNAUTHORIZED', 'API key has expired'),
      hasApiKey: true,
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_EXPIRED',
      message: 'API key has expired.'
    },
    {
      source: trpcError('UNAUTHORIZED', 'Unauthorized'),
      hasApiKey: true,
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_INVALID',
      message: 'Invalid API key.'
    },
    {
      source: trpcError('UNAUTHORIZED', 'Unauthorized'),
      hasApiKey: false,
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_MISSING',
      message: 'No Stacktape API key was specified.'
    },
    {
      source: trpcError('FORBIDDEN', 'Organization role cannot deploy'),
      hasApiKey: true,
      category: 'API_SERVER',
      code: 'STACKTAPE_API_PERMISSION_DENIED',
      message: 'Permission denied: Organization role cannot deploy'
    }
  ])('maps $code and preserves its tRPC cause', ({ source, hasApiKey, category, code, message }) => {
    const translated = translateStacktapeApiError({ error: source, hasApiKey });

    expect(translated.category).toBe(category);
    expect(translated.code).toBe(code);
    expect(translated.message).toBe(message);
    expect(translated.cause).toBe(source);
  });

  test('preserves actionable error codes, hints and the original cause', () => {
    const cause = new Error('credential expired');
    const source = new CliError({
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_EXPIRED',
      message: 'Your key expired.',
      hints: 'Run stacktape login.',
      cause
    });
    const translated = translateStacktapeApiError({ error: source, hasApiKey: true });
    expect(translated).toMatchObject({
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_EXPIRED',
      message: 'Your key expired.',
      hints: ['Run stacktape login.'],
      cause
    });
  });

  test('retains a transport error message and cause', () => {
    const source = new Error('Stacktape API request timed out');
    const translated = translateStacktapeApiError({ error: source, hasApiKey: true });

    expect(translated.code).toBe('STACKTAPE_API_REQUEST_FAILED');
    expect(translated.message).toBe(source.message);
    expect(translated.cause).toBe(source);
  });
});

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

// PR #419 review: a build error's message is recorded in the Console. It names the file, line and column; Bun's copy of
// the source line, which can hold a credential that the scrubber does not recognize, stays out.
test('a recorded build failure names the source position without the source line', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'stacktape-recorded-build-error-'));
  temporaryDirectories.push(cwd);
  await writeFile(join(cwd, 'package.json'), JSON.stringify({ name: 'recorded-build-error', private: true }));
  await writeFile(
    join(cwd, 'handler.ts'),
    'export default async () => {\n  const password: string = "REVIEW_CANARY_NOT_A_SECRET"; const broken = ;\n};\n'
  );
  const error = await createEsBundle({
    name: 'handler',
    cwd,
    entryfilePath: join(cwd, 'handler.ts'),
    distFolderPath: join(cwd, '.stacktape', 'dist'),
    existingDigests: [],
    invocationId: 'test',
    progressLogger: { eventContext: {}, startEvent: () => {}, updateEvent: () => {}, finishEvent: () => {} },
    minify: false,
    nodeTarget: '24',
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    isLambda: true,
    lambdaZip: true,
    packageExternalDependencies: false,
    nativeDependencyInstallationRootPath: join(cwd, '.stacktape', 'native'),
    installDependencies: async () => {},
    runDocker: async () => {
      throw new Error('Docker should not be needed for this bundle.');
    },
    createPackagingError: createCliPackagingError
  }).catch((caught: unknown) => caught as Error);
  expect(error).toBeInstanceOf(CliError);

  const record = spyOn(stacktapeTrpcApiManager.apiClient, 'recordStackOperation').mockResolvedValue(undefined as never);
  // The CLI build defines the version; source tests do not.
  const definedVersion = 'STACKTAPE_VERSION' in globalThis;
  if (!definedVersion) Reflect.set(globalThis, 'STACKTAPE_VERSION', '4.0.0-test');
  try {
    await recordStackOperationEnd({ success: false, interrupted: false, error: error as Error });
    const [payload] = record.mock.calls[0]!;
    expect(payload.description).toContain('handler.ts:2:');
    expect(payload.description).toContain('Unexpected ;');
    expect(JSON.stringify(payload)).not.toContain('REVIEW_CANARY_NOT_A_SECRET');
    expect(JSON.stringify(payload)).not.toContain('const broken');
  } finally {
    record.mockRestore();
    if (!definedVersion) Reflect.deleteProperty(globalThis, 'STACKTAPE_VERSION');
  }
});
