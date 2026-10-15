import { describe, expect, test } from 'bun:test';
import {
  describeFailover,
  evaluateZoneHealth,
  HEARTBEAT_MAX_AGE_SECONDS,
  runNatFailover,
  type FailoverReport,
  type NatFailoverDependencies,
  type NatFailoverTopology
} from './index';

/**
 * The routing rule, exercised through `runNatFailover` with recorded AWS calls: home zone healthy, home zone dead
 * (fail over to the lowest healthy zone), nothing healthy (touch nothing), replacement healthy (route back), a
 * terminating instance waiting in its lifecycle hook, and no calls at all when nothing changed.
 */

const NOW = 1_700_000_000_000;
const topology: NatFailoverTopology = {
  stackName: 'shop-prod',
  region: 'eu-west-1',
  zones: [
    {
      azIndex: 0,
      autoscalingGroupName: 'shop-prod-nat-instance-0-asg',
      networkInterfaceId: 'eni-0',
      heartbeatParameterName: '/stp/eu-west-1/shop-prod/nat-instance/0/heartbeat'
    },
    {
      azIndex: 1,
      autoscalingGroupName: 'shop-prod-nat-instance-1-asg',
      networkInterfaceId: 'eni-1',
      heartbeatParameterName: '/stp/eu-west-1/shop-prod/nat-instance/1/heartbeat'
    }
  ],
  routeTables: [
    { routeTableId: 'rtb-0', homeAzIndex: 0 },
    { routeTableId: 'rtb-1', homeAzIndex: 1 },
    { routeTableId: 'rtb-2', homeAzIndex: 1 }
  ]
};

type ZoneState = Awaited<ReturnType<NatFailoverDependencies['describeZones']>>[number];

const healthyZone = (azIndex: number, instanceId = `i-${azIndex}`): ZoneState => ({
  azIndex,
  instance: { instanceId, lifecycleState: 'InService', healthStatus: 'Healthy' },
  terminatingInstanceIds: [],
  instanceStatusOk: true,
  heartbeat: { instanceId, at: NOW / 1000 - 10 }
});

const createDeps = ({ zones, routes }: { zones: ZoneState[]; routes: Record<string, string | undefined> }) => {
  const replaced: [string, string][] = [];
  const completed: [string, string][] = [];
  const reports: FailoverReport[] = [];
  const marks: [string, boolean][] = [];
  const deps: NatFailoverDependencies = {
    markReported: async (networkInterfaceId, reported) => {
      marks.push([networkInterfaceId, reported]);
    },
    now: () => NOW,
    describeZones: async () => zones,
    describeRoutes: async () => new Map(Object.entries(routes)),
    replaceRoute: async (routeTableId, networkInterfaceId) => {
      replaced.push([routeTableId, networkInterfaceId]);
    },
    completeLifecycleAction: async (group, instanceId) => {
      completed.push([group, instanceId]);
    },
    report: async (event) => {
      reports.push(event);
    }
  };
  return { deps, replaced, completed, reports, marks };
};

const homeRoutes = { 'rtb-0': 'eni-0', 'rtb-1': 'eni-1', 'rtb-2': 'eni-1' };

describe('zone health', () => {
  test('needs an in-service, status-ok instance with a fresh heartbeat from that instance', () => {
    const nowSeconds = NOW / 1000;
    expect(evaluateZoneHealth({ zone: healthyZone(0), nowSeconds }).healthy).toBe(true);
    expect(evaluateZoneHealth({ zone: { ...healthyZone(0), instance: undefined }, nowSeconds }).reason).toBe(
      'no instance in service'
    );
    expect(
      evaluateZoneHealth({
        zone: {
          ...healthyZone(0),
          instance: { instanceId: 'i-0', lifecycleState: 'Pending', healthStatus: 'Healthy' }
        },
        nowSeconds
      }).healthy
    ).toBe(false);
    expect(evaluateZoneHealth({ zone: { ...healthyZone(0), instanceStatusOk: false }, nowSeconds }).reason).toContain(
      'status checks'
    );
    // A stale heartbeat, or one left by the previous instance of the zone, does not count.
    expect(
      evaluateZoneHealth({
        zone: { ...healthyZone(0), heartbeat: { instanceId: 'i-0', at: nowSeconds - HEARTBEAT_MAX_AGE_SECONDS - 1 } },
        nowSeconds
      }).healthy
    ).toBe(false);
    expect(
      evaluateZoneHealth({
        zone: { ...healthyZone(0), heartbeat: { instanceId: 'i-old', at: nowSeconds } },
        nowSeconds
      }).healthy
    ).toBe(false);
    expect(evaluateZoneHealth({ zone: { ...healthyZone(0), heartbeat: undefined }, nowSeconds }).reason).toContain(
      'not verified'
    );
  });
});

describe('route reconciliation', () => {
  test('does nothing while every zone is healthy and at home', async () => {
    const { deps, replaced, reports, completed } = createDeps({
      zones: [healthyZone(0), healthyZone(1)],
      routes: homeRoutes
    });
    await runNatFailover(topology, deps);
    expect(replaced).toEqual([]);
    expect(reports).toEqual([]);
    expect(completed).toEqual([]);
  });

  test('reroutes a zone between instances without opening an incident', async () => {
    const { deps, replaced, reports, marks } = createDeps({
      zones: [healthyZone(0), { ...healthyZone(1), instance: undefined }],
      routes: homeRoutes
    });
    await runNatFailover(topology, deps);
    expect(replaced).toEqual([
      ['rtb-1', 'eni-0'],
      ['rtb-2', 'eni-0']
    ]);
    expect(reports).toEqual([]);
    expect(marks).toEqual([]);
  });

  test('reports a zone whose instance left its failure reason on the interface before being replaced', async () => {
    const { deps, replaced, reports, marks } = createDeps({
      zones: [
        healthyZone(0),
        { ...healthyZone(1), instance: undefined, instanceFailure: 'the outbound check failed 3 times in a row' }
      ],
      routes: homeRoutes
    });
    await runNatFailover(topology, deps);
    expect(replaced).toEqual([
      ['rtb-1', 'eni-0'],
      ['rtb-2', 'eni-0']
    ]);
    expect(reports).toEqual([
      {
        type: 'ALARM_TRIGGERED',
        azIndex: 1,
        viaAzIndex: 0,
        reason: 'its instance stopped forwarding (the outbound check failed 3 times in a row)'
      }
    ]);
    expect(marks).toEqual([['eni-1', true]]);
  });

  test('opens one incident when a serving instance stops forwarding, and closes it once home again', async () => {
    const stale = {
      ...healthyZone(1),
      heartbeat: { instanceId: 'i-1', at: NOW / 1000 - HEARTBEAT_MAX_AGE_SECONDS - 5 }
    };
    const failing = createDeps({ zones: [healthyZone(0), stale], routes: homeRoutes });
    await runNatFailover(topology, failing.deps);
    expect(failing.replaced).toEqual([
      ['rtb-1', 'eni-0'],
      ['rtb-2', 'eni-0']
    ]);
    expect(failing.reports).toEqual([
      {
        type: 'ALARM_TRIGGERED',
        azIndex: 1,
        viaAzIndex: 0,
        reason: 'instance i-1 last verified outbound internet 95 seconds ago'
      }
    ]);
    expect(failing.marks).toEqual([['eni-1', true]]);

    // The next probe sees the marker and the zone still failed over: nothing new to say.
    const stillFailing = createDeps({
      zones: [healthyZone(0), { ...stale, failoverReported: true }],
      routes: { 'rtb-0': 'eni-0', 'rtb-1': 'eni-0', 'rtb-2': 'eni-0' }
    });
    await runNatFailover(topology, stillFailing.deps);
    expect(stillFailing.reports).toEqual([]);

    // The replacement is healthy: route home and close the incident exactly once.
    const recovered = createDeps({
      zones: [healthyZone(0), { ...healthyZone(1, 'i-new'), failoverReported: true }],
      routes: { 'rtb-0': 'eni-0', 'rtb-1': 'eni-0', 'rtb-2': 'eni-0' }
    });
    await runNatFailover(topology, recovered.deps);
    expect(recovered.reports).toEqual([{ type: 'ALARM_RESOLVED', azIndex: 1, reason: 'forwarding traffic' }]);
    expect(recovered.marks).toEqual([['eni-1', false]]);
  });

  test('leaves the routes alone when no zone is healthy', async () => {
    const { deps, replaced, reports } = createDeps({
      zones: [
        { ...healthyZone(0), heartbeat: undefined },
        { ...healthyZone(1), instance: undefined }
      ],
      routes: homeRoutes
    });
    await runNatFailover(topology, deps);
    expect(replaced).toEqual([]);
    expect(reports).toEqual([]);
  });

  test('routes back home once the replacement instance is healthy, and only then', async () => {
    const failedOver = { 'rtb-0': 'eni-0', 'rtb-1': 'eni-0', 'rtb-2': 'eni-0' };
    const notYet = createDeps({
      zones: [healthyZone(0), { ...healthyZone(1, 'i-new'), heartbeat: { instanceId: 'i-1', at: NOW / 1000 } }],
      routes: failedOver
    });
    await runNatFailover(topology, notYet.deps);
    expect(notYet.replaced).toEqual([]);

    const ready = createDeps({ zones: [healthyZone(0), healthyZone(1, 'i-new')], routes: failedOver });
    await runNatFailover(topology, ready.deps);
    expect(ready.replaced).toEqual([
      ['rtb-1', 'eni-1'],
      ['rtb-2', 'eni-1']
    ]);
    // No incident was opened for a planned replacement, so none is closed.
    expect(ready.reports).toEqual([]);
  });

  test('moves traffic away from a terminating instance before letting it go', async () => {
    const { deps, replaced, completed } = createDeps({
      zones: [
        healthyZone(0),
        {
          ...healthyZone(1),
          instance: { instanceId: 'i-1', lifecycleState: 'Terminating:Wait', healthStatus: 'Healthy' },
          terminatingInstanceIds: ['i-1']
        }
      ],
      routes: homeRoutes
    });
    await runNatFailover(topology, deps);
    expect(replaced).toEqual([
      ['rtb-1', 'eni-0'],
      ['rtb-2', 'eni-0']
    ]);
    expect(completed).toEqual([['shop-prod-nat-instance-1-asg', 'i-1']]);
  });

  test('lets a terminating instance go when nothing could take over', async () => {
    const { deps, replaced, completed } = createDeps({
      zones: [
        { ...healthyZone(0), heartbeat: undefined },
        {
          ...healthyZone(1),
          instance: { instanceId: 'i-1', lifecycleState: 'Terminating:Wait', healthStatus: 'Healthy' },
          terminatingInstanceIds: ['i-1']
        }
      ],
      routes: homeRoutes
    });
    await runNatFailover(topology, deps);
    expect(replaced).toEqual([]);
    expect(completed).toEqual([['shop-prod-nat-instance-1-asg', 'i-1']]);
  });
});

describe('wording', () => {
  test('tells a developer what happened, what it meant and that nothing is needed', () => {
    const triggered = describeFailover({
      type: 'ALARM_TRIGGERED',
      azIndex: 0,
      viaAzIndex: 1,
      reason: 'no instance in service'
    });
    expect(triggered.title).toBe('Outbound internet in availability zone 1 is going through zone 2');
    expect(triggered.description).toContain('up to a minute');
    expect(triggered.description).toContain('Nothing to do');
    const resolved = describeFailover({ type: 'ALARM_RESOLVED', azIndex: 0, reason: 'forwarding traffic' });
    expect(resolved.title).toBe('Outbound internet in availability zone 1 recovered');
  });
});
