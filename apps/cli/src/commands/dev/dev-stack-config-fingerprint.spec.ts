import { expect, test } from 'bun:test';
import { devStackConfigNeedsUpdate, getDevStackConfigFingerprint } from './dev-stack-config-fingerprint';

// The fingerprint decides whether `dev` redeploys the support stack. An unstable one redeploys on every start; a
// stack deployed before fingerprints existed carries no metadata and must be refreshed once.
test('the fingerprint ignores key order, changes with the configuration and refreshes unfingerprinted stacks', () => {
  const original = getDevStackConfigFingerprint({
    config: { stage: 'dev', resources: { api: { memory: 512, cpu: 0.5 } } }
  });
  expect(
    getDevStackConfigFingerprint({ config: { resources: { api: { cpu: 0.5, memory: 512 } }, stage: 'dev' } })
  ).toBe(original);
  const changed = getDevStackConfigFingerprint({
    config: { stage: 'dev', resources: { api: { memory: 1024, cpu: 0.5 } } }
  });
  expect(changed).not.toBe(original);
  expect(devStackConfigNeedsUpdate({ deployedFingerprint: original, desiredFingerprint: original })).toBe(false);
  expect(devStackConfigNeedsUpdate({ deployedFingerprint: original, desiredFingerprint: changed })).toBe(true);
  expect(devStackConfigNeedsUpdate({ deployedFingerprint: undefined, desiredFingerprint: original })).toBe(true);
});

// Lambda environment values carry the dev box address, the leased port and the local password: a new lease or a
// `--fresh-db` password must redeploy the stack, an unchanged one must not.
test('the fingerprint follows the dev network placement', () => {
  const config = { stage: 'dev' };
  const placement = (port: string) => ({
    subnetIds: ['subnet-a'],
    securityGroupId: 'sg-1',
    functions: { api: ['db'] },
    localResources: { db: { params: { host: '10.230.0.10', port }, environment: {} } }
  });
  const leased = getDevStackConfigFingerprint({ config, devNetwork: placement('20001') });
  expect(getDevStackConfigFingerprint({ config, devNetwork: placement('20001') })).toBe(leased);
  expect(getDevStackConfigFingerprint({ config, devNetwork: placement('20002') })).not.toBe(leased);
  expect(getDevStackConfigFingerprint({ config })).not.toBe(leased);
});
