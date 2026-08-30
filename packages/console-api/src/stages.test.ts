import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { classifyStage, isProductionStageName } from './stages.js';

describe('isProductionStageName', () => {
  test('recognizes the canonical production names case-insensitively', () => {
    for (const name of ['prod', 'production', 'prd', 'live', 'PROD', 'Production', 'PRD', 'Live']) {
      assert.equal(isProductionStageName(name), true, name);
    }
  });

  test('recognizes segmented variants', () => {
    for (const name of ['prod-eu', 'eu-prod', 'client-a-prod', 'prod_us_east_1', 'prod-blue', 'live-eu']) {
      assert.equal(isProductionStageName(name), true, name);
    }
  });

  test('rehearsal environments with production tokens are vetoed', () => {
    for (const name of ['pre-prod', 'preprod', 'non-prod', 'nonprod', 'prod-test', 'staging-live', 'dev-prod-copy']) {
      assert.equal(isProductionStageName(name), false, name);
    }
  });

  test('ordinary non-production names do not match', () => {
    for (const name of ['dev', 'staging', 'main', 'master', 'feature-x', 'livedemo', 'reproduction', 'pr-123', '']) {
      assert.equal(isProductionStageName(name), false, name);
    }
  });
});

describe('classifyStage', () => {
  test('explicit stage type always wins over the name', () => {
    assert.deepEqual(classifyStage({ stageName: 'weird-name', explicitStageType: 'production' }), {
      isProduction: true,
      source: 'explicit'
    });
    assert.deepEqual(classifyStage({ stageName: 'prod', explicitStageType: 'non-production' }), {
      isProduction: false,
      source: 'explicit'
    });
  });

  test('falls back to inference when no explicit type is declared', () => {
    assert.deepEqual(classifyStage({ stageName: 'prod-eu' }), { isProduction: true, source: 'inferred' });
    assert.deepEqual(classifyStage({ stageName: 'staging', explicitStageType: null }), {
      isProduction: false,
      source: 'inferred'
    });
  });
});
