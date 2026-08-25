import { describe, expect, test } from 'bun:test';
import { validateServiceExpectations } from './service-expectations';

const services = [
  {
    name: 'web',
    path: 'apps/web',
    framework: 'react-router',
    exposesHttp: true,
    buildCommand: 'npm run build',
    startCommand: 'npm run start',
    dockerfile: 'apps/web/Dockerfile'
  },
  {
    name: 'worker',
    path: 'apps/worker',
    exposesHttp: false
  }
];

describe('service expectation matching', () => {
  test('matches by unique name and checks every requested semantic field', () => {
    expect(
      validateServiceExpectations(
        [
          { name: 'worker', exposesHttp: false },
          {
            name: 'web',
            path: 'apps/web',
            framework: 'react-router',
            exposesHttp: true,
            buildCommand: 'npm run build',
            startCommand: 'npm run start',
            dockerfile: 'apps/web/Dockerfile'
          }
        ],
        services
      )
    ).toEqual({ assertions: 9, failures: [] });
  });

  test('does not fall back to the first service when a named service is absent', () => {
    const result = validateServiceExpectations([{ name: 'api', framework: 'react-router' }], services);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('expected service "api" was not found');
  });

  test('fails closed when inferred service names are ambiguous', () => {
    const result = validateServiceExpectations(
      [{ name: 'web', framework: 'react-router' }],
      [...services, { name: 'web', path: 'other', exposesHttp: true }]
    );
    expect(result.failures).toEqual([
      'expected service "web" matched 2 inferred services; service names must be unique.'
    ]);
  });

  test('reports build-command drift', () => {
    const result = validateServiceExpectations([{ name: 'web', buildCommand: 'pnpm build' }], services);
    expect(result.failures).toEqual(['service web buildCommand: expected "pnpm build"; got "npm run build".']);
  });
});
