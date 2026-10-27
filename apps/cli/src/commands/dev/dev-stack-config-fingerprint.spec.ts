import { expect, test } from 'bun:test';
import {
  describeDevStackUpdateCause,
  getDevStackConfigFingerprint,
  getDevStackUpdateCause
} from './dev-stack-config-fingerprint';

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
  expect(getDevStackUpdateCause({ deployedFingerprint: original, desiredFingerprint: original })).toBeUndefined();
  expect(getDevStackUpdateCause({ deployedFingerprint: original, desiredFingerprint: changed })).toEqual({
    kind: 'parts',
    parts: ['config']
  });
  expect(getDevStackUpdateCause({ deployedFingerprint: undefined, desiredFingerprint: original })).toEqual({
    kind: 'unknown'
  });
  expect(getDevStackUpdateCause({ deployedFingerprint: 'v4:0123456789abcdef', desiredFingerprint: original })).toEqual({
    kind: 'version'
  });
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

// The update message names what changed. Moving a stage to a worktree whose databases have another password says so,
// instead of "the configuration changed"; one with the same password does not update the stack at all.
test('the update cause names the changed input', () => {
  const config = { stage: 'dev' };
  const placement = ({ password = 'p1', port = '20001', subnet = 'subnet-a' } = {}) => ({
    subnetIds: [subnet],
    securityGroupId: 'sg-1',
    functions: { api: ['db'] },
    localResources: {
      db: {
        params: {
          host: '10.230.0.10',
          port,
          dbName: 'app',
          connectionString: `postgresql://postgres:${password}@10.230.0.10:${port}/app`
        },
        environment: {}
      }
    }
  });
  const trust = (arn: string) => ({ Effect: 'Allow', Condition: { ArnLike: { 'aws:PrincipalArn': [arn] } } });
  const fingerprint = (input: { password?: string; port?: string; subnet?: string; user?: string } = {}) =>
    getDevStackConfigFingerprint({
      config,
      devNetwork: placement(input),
      devTrustStatement: trust(input.user ?? 'arn:aws:iam::1:user/a')
    });
  const deployed = fingerprint();
  const describe = (desired: string, takeOver = false) => {
    const cause = getDevStackUpdateCause({ deployedFingerprint: deployed, desiredFingerprint: desired });
    return cause && describeDevStackUpdateCause(cause, { takeOver });
  };

  expect(describe(fingerprint())).toBeUndefined();
  expect(describe(fingerprint({ password: 'p2' }))).toBe('the local databases have another password');
  expect(describe(fingerprint({ password: 'p2' }), true)).toBe(
    "this session took the stage over, and the local databases in this directory have another password than the previous session's"
  );
  expect(describe(fingerprint({ port: '20002' }), true)).toBe(
    'the dev box address or relay ports of the local databases changed'
  );
  expect(describe(fingerprint({ subnet: 'subnet-b', user: 'arn:aws:iam::1:user/b' }))).toBe(
    'its functions move to other subnets of the dev network, and local containers now use the roles with other AWS credentials'
  );
  const cause = getDevStackUpdateCause({ deployedFingerprint: undefined, desiredFingerprint: deployed });
  expect(describeDevStackUpdateCause(cause!)).toBe('it was deployed without a record of its configuration');
});

// A table a stream trigger needs, or one named remote on a later start, must be deployed; a skipped function's triggers
// must leave and come back. Neither shows in the configuration.
test('the fingerprint follows the remote resources and the skipped functions, in any order', () => {
  const config = { stage: 'dev' };
  const original = getDevStackConfigFingerprint({ config, remoteResourceNames: ['a', 'b'] });
  expect(getDevStackConfigFingerprint({ config, remoteResourceNames: new Set(['b', 'a']) })).toBe(original);
  const remoteChanged = getDevStackConfigFingerprint({ config, remoteResourceNames: ['a'] });
  const skipped = getDevStackConfigFingerprint({
    config,
    remoteResourceNames: ['a', 'b'],
    skippedFunctionNames: ['f']
  });
  expect(getDevStackUpdateCause({ deployedFingerprint: original, desiredFingerprint: remoteChanged })).toEqual({
    kind: 'parts',
    parts: ['remoteResources']
  });
  const cause = getDevStackUpdateCause({ deployedFingerprint: original, desiredFingerprint: skipped })!;
  expect(describeDevStackUpdateCause(cause)).toBe(
    'other functions are left out of the session, and the dev stack keeps them without triggers'
  );
});
