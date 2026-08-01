/**
 * Keeps `_test-stacks/packaging-smoke` able to do its job.
 *
 * That fixture is deployed to real AWS by hand (see its README) to check that split bundling still produces a
 * shared Lambda layer and that both functions still answer over their function URLs. Nothing here talks to AWS:
 * these assertions only protect the properties that make the manual run meaningful, so a broken fixture is found
 * before somebody spends a deployment on it.
 */

import { describe, expect, test } from 'bun:test';
import { validateConfigWithZod } from '@domain-services/config-manager/utils/zod-validator';
import { DEFAULT_LAYER_CONFIG } from '@stacktape/packaging/split-bundler/layer-assignment';
import { handler as catalogReportHandler } from '../../_test-stacks/packaging-smoke/src/catalog-report';
import { handler as retryAdvisorHandler } from '../../_test-stacks/packaging-smoke/src/retry-advisor';
import {
  catalogIdentity,
  HTTP_STATUS_CATALOG,
  type StatusClass
} from '../../_test-stacks/packaging-smoke/src/status-catalog';
import getPackagingSmokeConfig from '../../_test-stacks/packaging-smoke/stacktape';

const STATUS_CLASSES: StatusClass[] = ['informational', 'success', 'redirection', 'client-error', 'server-error'];

const { config: smokeConfig } = getPackagingSmokeConfig({
  projectName: 'stacktape-v4-packaging-smoke',
  stage: 'dev',
  region: 'eu-west-1',
  cliArgs: {} as any,
  command: 'synth',
  awsProfile: '',
  user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
});

const callRetryAdvisor = async (status?: string) => {
  const response = await retryAdvisorHandler({ queryStringParameters: status === undefined ? {} : { status } });
  return { statusCode: response.statusCode, payload: JSON.parse(response.body) };
};

const callCatalogReport = async () => {
  const response = await catalogReportHandler();
  return { statusCode: response.statusCode, payload: JSON.parse(response.body) };
};

describe('real-AWS packaging smoke fixture', () => {
  test('the shared module is big enough for the split bundler to lift it into a layer', () => {
    // Layering needs a chunk of at least `minChunkSize`. Lambda split bundling runs unminified, so the
    // serialized table is a lower bound on the chunk it ends up in; the doubled threshold keeps the fixture
    // meaningful even if minification is turned on later.
    const serializedCatalogBytes = Buffer.byteLength(JSON.stringify(HTTP_STATUS_CATALOG), 'utf8');

    expect(serializedCatalogBytes).toBeGreaterThan(DEFAULT_LAYER_CONFIG.minChunkSize * 2);
  });

  test('the catalog is well formed, so a deployed response can be checked against it', () => {
    const codes = HTTP_STATUS_CATALOG.map((entry) => entry.code);

    expect(new Set(codes).size).toBe(codes.length);
    for (const entry of HTTP_STATUS_CATALOG) {
      expect(entry.code).toBeGreaterThanOrEqual(100);
      expect(entry.code).toBeLessThan(600);
      expect(STATUS_CLASSES).toContain(entry.statusClass);
      expect(entry.reason.length).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });

  test('the stack declares the two Node Lambdas split bundling needs, each with a public function URL', () => {
    // Two is exactly the minimum number of Node Lambdas that turns split bundling on, and the fixture stays at
    // that minimum to keep the deployment cheap.
    expect(Object.keys(smokeConfig.resources).sort()).toEqual(['catalogReport', 'retryAdvisor']);

    for (const resource of Object.values(smokeConfig.resources)) {
      expect(resource).toEqual(
        expect.objectContaining({
          type: 'function',
          properties: expect.objectContaining({
            packaging: expect.objectContaining({
              type: 'stacktape-lambda-buildpack',
              properties: expect.objectContaining({ entryfilePath: expect.stringMatching(/\.ts$/) })
            }),
            url: { enabled: true, authMode: 'NONE' },
            environment: [{ name: 'CANARY_REVISION', value: 'base' }]
          })
        })
      );
    }

    expect(validateConfigWithZod({ config: smokeConfig, configPath: 'stacktape.ts' })).toEqual({ valid: true });
  });

  test('both function URLs are exposed as stack outputs, so the operator can find them after a deploy', () => {
    expect(smokeConfig.stackConfig?.tags).toEqual([{ name: 'stacktape-canary-owner', value: 'local' }]);
    expect(smokeConfig.stackConfig?.outputs).toEqual([
      expect.objectContaining({ name: 'retryAdvisorUrl', value: "$ResourceParam('retryAdvisor','url')" }),
      expect.objectContaining({ name: 'catalogReportUrl', value: "$ResourceParam('catalogReport','url')" })
    ]);
  });

  test('each handler reports its own name and the identity of the shared module it ran', async () => {
    const advisor = await callRetryAdvisor('503');
    const report = await callCatalogReport();

    expect(advisor.payload.handler).toBe('retryAdvisor');
    expect(report.payload.handler).toBe('catalogReport');
    expect(advisor.payload.revision).toBe('base');
    expect(report.payload.revision).toBe('base');
    expect(advisor.payload.catalog).toEqual(catalogIdentity());
    expect(report.payload.catalog).toEqual(catalogIdentity());
  });

  test('the two handlers answer with distinguishable work, not the same payload', async () => {
    const advisor = (await callRetryAdvisor('503')).payload;
    const report = (await callCatalogReport()).payload;

    expect(advisor.status).toEqual({
      code: 503,
      reason: 'Service Unavailable',
      statusClass: 'server-error',
      retryable: true,
      note: expect.any(String)
    });
    expect(advisor.advice).toBe('retry-with-backoff');
    expect(advisor.countsByClass).toBeUndefined();

    expect(report.countsByClass['server-error']).toBe(
      HTTP_STATUS_CATALOG.filter((entry) => entry.statusClass === 'server-error').length
    );
    expect(report.retryableCodes).toContain(429);
    expect(report.retryableCodes).not.toContain(200);
    expect(report.status).toBeUndefined();
  });

  test('a status outside the catalog is refused without losing the shared-module identity', async () => {
    const missing = await callRetryAdvisor('599');
    const nonNumeric = await callRetryAdvisor('not-a-status');

    expect(missing.statusCode).toBe(404);
    expect(missing.payload.catalog).toEqual(catalogIdentity());
    expect(nonNumeric.statusCode).toBe(400);
    expect(nonNumeric.payload.catalog).toEqual(catalogIdentity());
  });

  test('a request without a status falls back to the documented default', async () => {
    const defaulted = await callRetryAdvisor();

    expect(defaulted.statusCode).toBe(200);
    expect(defaulted.payload.status.code).toBe(503);
  });
});
