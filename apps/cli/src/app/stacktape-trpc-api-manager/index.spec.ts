import { describe, expect, test } from 'bun:test';
import { CliError } from '@utils/errors';
import { TRPCClientError } from '@trpc/client';

import { translateStacktapeApiError } from './index';

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
