import { expect, test } from 'bun:test';
import { getDevStackConfigFingerprint } from './dev-stack-config-fingerprint';

// The fingerprint decides whether `dev` redeploys the support stack. An unstable one redeploys on every start.
test('the fingerprint ignores key order and changes with the configuration', () => {
  const original = getDevStackConfigFingerprint({ stage: 'dev', resources: { api: { memory: 512, cpu: 0.5 } } });
  expect(getDevStackConfigFingerprint({ resources: { api: { cpu: 0.5, memory: 512 } }, stage: 'dev' })).toBe(original);
  expect(getDevStackConfigFingerprint({ stage: 'dev', resources: { api: { memory: 1024, cpu: 0.5 } } })).not.toBe(
    original
  );
});
