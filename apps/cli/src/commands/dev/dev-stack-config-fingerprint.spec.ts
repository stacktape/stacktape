import { expect, test } from 'bun:test';
import { devStackConfigNeedsUpdate, getDevStackConfigFingerprint } from './dev-stack-config-fingerprint';

// The fingerprint decides whether `dev` redeploys the support stack. An unstable one redeploys on every start; a
// stack deployed before fingerprints existed carries no metadata and must be refreshed once.
test('the fingerprint ignores key order, changes with the configuration and refreshes unfingerprinted stacks', () => {
  const original = getDevStackConfigFingerprint({ stage: 'dev', resources: { api: { memory: 512, cpu: 0.5 } } });
  expect(getDevStackConfigFingerprint({ resources: { api: { cpu: 0.5, memory: 512 } }, stage: 'dev' })).toBe(original);
  const changed = getDevStackConfigFingerprint({ stage: 'dev', resources: { api: { memory: 1024, cpu: 0.5 } } });
  expect(changed).not.toBe(original);
  expect(devStackConfigNeedsUpdate({ deployedFingerprint: original, desiredFingerprint: original })).toBe(false);
  expect(devStackConfigNeedsUpdate({ deployedFingerprint: original, desiredFingerprint: changed })).toBe(true);
  expect(devStackConfigNeedsUpdate({ deployedFingerprint: undefined, desiredFingerprint: original })).toBe(true);
});
