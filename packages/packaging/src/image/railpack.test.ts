import { describe, expect, test } from 'bun:test';
import { applyStacktapePlanPolicy, getBuildEnvironmentHash, getRailpackVariables, type RailpackPlan } from './railpack';

const createPackagingError = ({ message, type }: { message: string; type: string }) =>
  Object.assign(new Error(message), { type });

/** Representative planner output for the pure policy rules. */
const preparedPlan = (overrides: Partial<RailpackPlan> = {}): RailpackPlan => ({
  steps: [{ name: 'install', commands: [{ cmd: 'uv sync' }] }],
  exclude: ['*.log', 'generated', '!generated/config.json'],
  deploy: {
    startCommand: 'uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}',
    variables: { RAILPACK_VERSION: '0.40.1' }
  },
  ...overrides
});

describe('railpack variables', () => {
  test('maps buildpack properties to railpack configuration and keeps build variables apart as secrets', () => {
    const { configuration, buildVariables } = getRailpackVariables({
      startCommand: 'gunicorn app:app',
      buildCommand: 'npm run build',
      installCommand: 'npm ci',
      packages: { node: '22', pnpm: '10' },
      aptPackages: ['ffmpeg', 'libvips'],
      buildEnvironment: [
        { name: 'VITE_API_URL', value: 'https://api.example.com' },
        { name: 'FLAG', value: true }
      ],
      createPackagingError
    });

    expect(configuration).toEqual({
      RAILPACK_SKIP_MIGRATIONS: 'true',
      RAILPACK_START_CMD: 'gunicorn app:app',
      RAILPACK_BUILD_CMD: 'npm run build',
      RAILPACK_INSTALL_CMD: 'npm ci',
      RAILPACK_PACKAGES: 'node@22 pnpm@10',
      RAILPACK_BUILD_APT_PACKAGES: 'ffmpeg libvips',
      RAILPACK_DEPLOY_APT_PACKAGES: 'ffmpeg libvips'
    });
    expect(buildVariables).toEqual({ VITE_API_URL: 'https://api.example.com', FLAG: 'true' });
  });

  test('rejects names railpack would misread and the reserved prefix', () => {
    expect(() =>
      getRailpackVariables({ buildEnvironment: [{ name: 'BAD NAME', value: 'x' }], createPackagingError })
    ).toThrow('invalid');
    expect(() =>
      getRailpackVariables({ buildEnvironment: [{ name: 'RAILPACK_START_CMD', value: 'x' }], createPackagingError })
    ).toThrow('RAILPACK_ prefix');
    expect(() =>
      getRailpackVariables({ buildEnvironment: [{ name: 'BUILDKIT_SYNTAX', value: 'x' }], createPackagingError })
    ).toThrow('BUILDKIT_ prefix');
    expect(() => getRailpackVariables({ packages: { node: '22 lts' }, createPackagingError })).toThrow('whitespace');
    expect(() => getRailpackVariables({ aptPackages: ['lib a'], createPackagingError })).toThrow('whitespace');
  });

  test('hashes build variable values independently of their order', () => {
    const forward = getBuildEnvironmentHash({ A: '1', B: '2' });
    expect(getBuildEnvironmentHash({ B: '2', A: '1' })).toBe(forward);
    expect(getBuildEnvironmentHash({ A: '1', B: '3' })).not.toBe(forward);
    expect(getBuildEnvironmentHash({})).toHaveLength(64);
  });
});

describe('plan policy', () => {
  test('keeps only the build variables as secrets, never railpack configuration variables', () => {
    const plan = preparedPlan({
      secrets: ['RAILPACK_SKIP_MIGRATIONS', 'RAILPACK_START_CMD', 'VITE_API_URL'],
      steps: [
        { name: 'install', secrets: ['RAILPACK_START_CMD', 'VITE_API_URL'] },
        { name: 'build', secrets: ['*'] }
      ]
    });
    const policed = applyStacktapePlanPolicy({ plan, startCommand: 'npm start' });
    expect(policed.secrets).toEqual(['VITE_API_URL']);
    expect(policed.steps).toEqual([
      { name: 'install', secrets: ['VITE_API_URL'] },
      { name: 'build', secrets: ['*'] }
    ]);
    expect(plan.secrets).toHaveLength(3);
  });

  test('removes the Django migration from a detected start command but keeps a configured one', () => {
    const plan = preparedPlan({
      deploy: {
        startCommand: 'python manage.py migrate && gunicorn --bind 0.0.0.0:${PORT:-8000} shop.wsgi:application'
      }
    });
    expect(applyStacktapePlanPolicy({ plan, startCommand: undefined }).deploy?.startCommand).toBe(
      'gunicorn --bind 0.0.0.0:${PORT:-8000} shop.wsgi:application'
    );
    expect(applyStacktapePlanPolicy({ plan, startCommand: 'python manage.py migrate && gunicorn shop.wsgi' })).toBe(
      plan
    );
    const untouched = preparedPlan();
    expect(applyStacktapePlanPolicy({ plan: untouched, startCommand: undefined })).toBe(untouched);
  });
});
