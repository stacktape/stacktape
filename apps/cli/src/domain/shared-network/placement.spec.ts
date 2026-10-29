import { describe, expect, test } from 'bun:test';
import { decideNetworkPlacement, formatNetworkPlacement, type NetworkPlacementInput } from './placement';

const firstDeploy = (overrides: Partial<NetworkPlacementInput> = {}): NetworkPlacementInput => ({
  stageName: 'dev',
  needsVpc: true,
  reuseVpc: false,
  deployed: 'none',
  exclusions: [],
  canAsk: false,
  ...overrides
});

const kindOf = (overrides: Partial<NetworkPlacementInput>) => decideNetworkPlacement(firstDeploy(overrides)).kind;

describe('network placement of a first deploy', () => {
  test('the stage name decides when it says production or non-production', () => {
    for (const stageName of ['dev', 'staging', 'test', 'qa', 'preview-3', 'pr-12', 'feature-login', 'e2e', 'ci']) {
      expect(kindOf({ stageName })).toBe('shared');
    }
    for (const stageName of ['prod', 'production', 'live-eu', 'prd']) expect(kindOf({ stageName })).toBe('own');
  });

  test('an ambiguous name gets its own VPC without a terminal, and says how to choose', () => {
    const decision = decideNetworkPlacement(firstDeploy({ stageName: 'acme' }));
    expect(decision.kind).toBe('own');
    if (!('reason' in decision)) throw new Error('expected a decision');
    expect(formatNetworkPlacement(decision)).toBe(
      'Network: own VPC (the stage name `acme` does not say whether it is production). Set `stackConfig.stageType` or `stackConfig.vpc.shared` to choose.'
    );
  });

  test('an ambiguous name is asked about once in a terminal, and the answer decides', () => {
    expect(kindOf({ stageName: 'main', canAsk: true })).toBe('ask');
    expect(kindOf({ stageName: 'main', canAsk: true, answeredStageType: 'non-production' })).toBe('shared');
    expect(kindOf({ stageName: 'main', canAsk: true, answeredStageType: 'production' })).toBe('own');
    // A name that decides is never asked about; one with both kinds of token does not decide.
    expect(kindOf({ stageName: 'dev', canAsk: true })).toBe('shared');
    expect(kindOf({ stageName: 'pre-prod', canAsk: true })).toBe('ask');
    expect(kindOf({ stageName: 'prod-ci' })).toBe('own');
  });

  test('vpc.shared wins over every classification', () => {
    expect(kindOf({ stageName: 'prod', shared: true })).toBe('shared');
    expect(kindOf({ stageName: 'dev', shared: false })).toBe('own');
    expect(kindOf({ stageName: 'acme', shared: true, explicitStageType: 'production' })).toBe('shared');
  });

  test('stackConfig.stageType, then the Console stage type, win over the name', () => {
    expect(kindOf({ stageName: 'dev', explicitStageType: 'production', consoleStageType: 'non-production' })).toBe(
      'own'
    );
    expect(kindOf({ stageName: 'prod', explicitStageType: 'non-production' })).toBe('shared');
    expect(kindOf({ stageName: 'acme', consoleStageType: 'non-production' })).toBe('shared');
    expect(kindOf({ stageName: 'dev', consoleStageType: 'production' })).toBe('own');
  });

  test('what the shared network cannot host gives the stage its own VPC, and contradicts vpc.shared', () => {
    const exclusions = ['`stackConfig.nat: gateway` (its NAT is a single `ec2` instance)'];
    const decision = decideNetworkPlacement(firstDeploy({ exclusions }));
    expect(decision).toMatchObject({ kind: 'own' });
    expect('reason' in decision && decision.reason).toContain('nat: gateway');
    expect(decideNetworkPlacement(firstDeploy({ exclusions, shared: true }))).toMatchObject({
      kind: 'error',
      code: 'NETWORK_SHARED_UNSUPPORTED'
    });
  });

  test('stages without networked resources or with a reused VPC are not placed', () => {
    expect(kindOf({ needsVpc: false })).toBe('none');
    expect(kindOf({ reuseVpc: true })).toBe('reused');
  });
});

describe('network placement of a deployed stage', () => {
  test('is fixed: a stage with its own VPC keeps it, a shared stage stays shared', () => {
    expect(kindOf({ deployed: 'own', stageName: 'dev' })).toBe('own');
    expect(kindOf({ deployed: 'shared', stageName: 'acme' })).toBe('shared');
    expect(decideNetworkPlacement(firstDeploy({ deployed: 'own', shared: true }))).toMatchObject({
      kind: 'error',
      code: 'NETWORK_PLACEMENT_FIXED'
    });
    expect(decideNetworkPlacement(firstDeploy({ deployed: 'shared', shared: false }))).toMatchObject({
      kind: 'error',
      code: 'NETWORK_PLACEMENT_FIXED'
    });
  });

  test('a shared stage that became production is warned on every deploy until vpc.shared acknowledges it', () => {
    const warned = decideNetworkPlacement(firstDeploy({ deployed: 'shared', explicitStageType: 'production' }));
    expect(warned).toMatchObject({ kind: 'shared' });
    expect('warning' in warned && warned.warning).toContain('deleting and redeploying');
    const byName = decideNetworkPlacement(firstDeploy({ deployed: 'shared', stageName: 'prod' }));
    expect('warning' in byName && byName.warning).toContain('named like a production stage');
    const acknowledged = decideNetworkPlacement(
      firstDeploy({ deployed: 'shared', explicitStageType: 'production', shared: true })
    );
    expect('warning' in acknowledged && acknowledged.warning).toBeFalsy();
  });

  test('a shared stage cannot switch to a reused VPC', () => {
    expect(decideNetworkPlacement(firstDeploy({ deployed: 'shared', reuseVpc: true }))).toMatchObject({
      kind: 'error',
      code: 'NETWORK_PLACEMENT_FIXED'
    });
  });

  test('a shared stage cannot add what the shared network cannot host', () => {
    expect(
      decideNetworkPlacement(firstDeploy({ deployed: 'shared', exclusions: ['MongoDB Atlas clusters (`db`)'] }))
    ).toMatchObject({ kind: 'error', code: 'NETWORK_SHARED_UNSUPPORTED' });
  });

  test('a stage that removed all networked resources is placed again by its next first networked deploy', () => {
    expect(kindOf({ deployed: 'shared', needsVpc: false })).toBe('none');
  });
});
