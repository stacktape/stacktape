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

  test('a production word followed directly by a number is production', () => {
    for (const name of ['prod2', 'production2', 'live1', 'prd01', 'prod2-eu', 'eu-live3']) {
      assert.equal(isProductionStageName(name), true, name);
    }
    for (const name of ['prod2-test', 'staging2-live', 'dev1-prod', 'pr42', '2prod', 'prod-2']) {
      assert.equal(isProductionStageName(name), name === 'prod-2', name);
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
  test('the config wins over the Console, and the Console over the name', () => {
    assert.deepEqual(
      classifyStage({ stageName: 'dev', explicitStageType: 'non-production', consoleStageType: 'production' }),
      { isProduction: false, source: 'explicit' }
    );
    assert.deepEqual(classifyStage({ stageName: 'main', consoleStageType: 'production' }), {
      isProduction: true,
      source: 'console'
    });
    assert.deepEqual(classifyStage({ stageName: 'prod', consoleStageType: 'non-production' }), {
      isProduction: false,
      source: 'console'
    });
    assert.deepEqual(classifyStage({ stageName: 'prod', consoleStageType: null }), {
      isProduction: true,
      source: 'inferred'
    });
  });

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
