import type { NatFailoverRuleInput } from '@domain-services/config-manager/resolved-types/resources';
import {
  AutoScalingClient,
  CompleteLifecycleActionCommand,
  DescribeAutoScalingGroupsCommand
} from '@aws-sdk/client-auto-scaling';
import {
  CreateTagsCommand,
  DeleteTagsCommand,
  DescribeInstanceStatusCommand,
  DescribeNetworkInterfacesCommand,
  DescribeRouteTablesCommand,
  EC2Client,
  ReplaceRouteCommand
} from '@aws-sdk/client-ec2';
import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsIdentityProtectedClient } from '@stacktape-api/aws-identity-protected';

/**
 * Keeps the private subnets' default routes pointed at a NAT instance that forwards traffic.
 *
 * Every zone's instance proves itself: its boot script verifies outbound internet, and a timer on the instance keeps
 * writing a heartbeat parameter only while that check passes. A zone is healthy when its Auto Scaling group has a
 * running, in-service instance whose heartbeat is fresh and names that instance. Each private route table has a home
 * zone; while the home zone is unhealthy the table is routed through the lowest healthy zone, and it goes back home
 * as soon as the home zone's (replacement) instance is healthy. When no zone is healthy nothing is touched.
 *
 * Invoked every minute by a schedule and immediately on the NAT Auto Scaling groups' events. A terminating instance
 * waits in its lifecycle hook until this handler has moved the routes away, so planned replacements (a new image, a
 * size change, a failed health check) lose almost no traffic; only a sudden hardware failure costs up to a minute.
 */

/** A heartbeat older than this is stale: the timer writes one every 20 seconds while the outbound check passes. */
export const HEARTBEAT_MAX_AGE_SECONDS = 90;
export const NAT_FAILOVER_ALARM_PREFIX = 'nat-failover-zone-';
const LIFECYCLE_HOOK_NAME = 'stacktape-nat-drain';
const INTERNET_CIDR = '0.0.0.0/0';

export type NatFailoverTopology = NatFailoverRuleInput['natFailover'];

export type ZoneHealth = {
  azIndex: number;
  healthy: boolean;
  /**
   * A serving instance stopped forwarding (stale heartbeat or failed status checks). Only this is worth an incident;
   * a zone between instances during a deploy, a replacement or a lifecycle hook is expected and recovers by itself.
   */
  failed: boolean;
  instanceId?: string;
  /** Instance ids waiting in the termination lifecycle hook. */
  terminatingInstanceIds: string[];
  /** Whether an incident for this zone is open (the zone's interface carries the marker tag). */
  failoverReported: boolean;
  /** The failure reason the zone's instance left on the interface, until the zone is healthy again. */
  instanceFailure?: string;
  reason: string;
};

export type RoutePlan = {
  routeTableId: string;
  homeAzIndex: number;
  currentAzIndex: number | undefined;
  desiredAzIndex: number | undefined;
};

type Heartbeat = { instanceId?: string; at?: number };

export type NatFailoverDependencies = {
  describeZones: (topology: NatFailoverTopology) => Promise<
    {
      azIndex: number;
      instance?: { instanceId: string; lifecycleState: string; healthStatus: string };
      terminatingInstanceIds: string[];
      instanceStatusOk?: boolean;
      heartbeat?: Heartbeat;
      failoverReported?: boolean;
      /** The reason the zone's instance reported before marking itself unhealthy, if any. */
      instanceFailure?: string;
    }[]
  >;
  describeRoutes: (topology: NatFailoverTopology) => Promise<Map<string, string | undefined>>;
  replaceRoute: (routeTableId: string, networkInterfaceId: string) => Promise<void>;
  completeLifecycleAction: (autoscalingGroupName: string, instanceId: string) => Promise<void>;
  report: (event: FailoverReport) => Promise<void>;
  /** Remembers (or forgets) that the zone's failover was reported, on the zone's interface. */
  markReported: (networkInterfaceId: string, reported: boolean) => Promise<void>;
  now: () => number;
};

export const FAILOVER_REPORTED_TAG = 'stp:nat-failover-reported';
/** Written on the zone's interface by the instance's own heartbeat before it marks itself unhealthy. */
export const INSTANCE_FAILURE_TAG = 'stp:nat-failure';

export type FailoverReport = {
  type: 'ALARM_TRIGGERED' | 'ALARM_RESOLVED';
  azIndex: number;
  viaAzIndex?: number;
  reason: string;
};

export const evaluateZoneHealth = (input: {
  zone: Awaited<ReturnType<NatFailoverDependencies['describeZones']>>[number];
  nowSeconds: number;
}): ZoneHealth => {
  const health = evaluateInstanceHealth(input);
  // An instance that found itself not forwarding leaves the reason on the zone's interface before the Auto Scaling
  // group replaces it; without that, the replacement would look like a planned one.
  if (!health.healthy && input.zone.instanceFailure) {
    return { ...health, failed: true, reason: `its instance stopped forwarding (${input.zone.instanceFailure})` };
  }
  return health;
};

const evaluateInstanceHealth = ({
  zone,
  nowSeconds
}: {
  zone: Awaited<ReturnType<NatFailoverDependencies['describeZones']>>[number];
  nowSeconds: number;
}): ZoneHealth => {
  const base = {
    azIndex: zone.azIndex,
    terminatingInstanceIds: zone.terminatingInstanceIds,
    failoverReported: zone.failoverReported ?? false,
    ...(zone.instanceFailure && { instanceFailure: zone.instanceFailure })
  };
  if (!zone.instance) return { ...base, healthy: false, failed: false, reason: 'no instance in service' };
  const { instanceId, lifecycleState, healthStatus } = zone.instance;
  if (lifecycleState !== 'InService') {
    return {
      ...base,
      instanceId,
      healthy: false,
      failed: false,
      reason: `instance ${instanceId} is ${lifecycleState}`
    };
  }
  if (healthStatus !== 'Healthy') {
    return { ...base, instanceId, healthy: false, failed: true, reason: `instance ${instanceId} is ${healthStatus}` };
  }
  if (zone.instanceStatusOk === false) {
    return {
      ...base,
      instanceId,
      healthy: false,
      failed: true,
      reason: `instance ${instanceId} fails its EC2 status checks`
    };
  }
  if (zone.heartbeat?.instanceId !== instanceId || typeof zone.heartbeat.at !== 'number') {
    // A replacement that has not finished booting yet; the stack update fails if it never verifies.
    return {
      ...base,
      instanceId,
      healthy: false,
      failed: false,
      reason: `instance ${instanceId} has not verified outbound internet`
    };
  }
  const age = nowSeconds - zone.heartbeat.at;
  if (age > HEARTBEAT_MAX_AGE_SECONDS) {
    return {
      ...base,
      instanceId,
      healthy: false,
      failed: true,
      reason: `instance ${instanceId} last verified outbound internet ${Math.round(age)} seconds ago`
    };
  }
  return { ...base, instanceId, healthy: true, failed: false, reason: 'forwarding traffic' };
};

/** Which zone each private route table should use: home when healthy, else the lowest healthy zone, else unchanged. */
export const planRoutes = ({
  topology,
  zones,
  currentTargets
}: {
  topology: NatFailoverTopology;
  zones: ZoneHealth[];
  currentTargets: Map<string, string | undefined>;
}): RoutePlan[] => {
  const healthyZones = zones.filter(({ healthy }) => healthy).map(({ azIndex }) => azIndex);
  const fallback = healthyZones.length ? Math.min(...healthyZones) : undefined;
  const azIndexOfInterface = (networkInterfaceId: string | undefined) =>
    topology.zones.find((zone) => zone.networkInterfaceId === networkInterfaceId)?.azIndex;
  return topology.routeTables.map(({ routeTableId, homeAzIndex }) => {
    const currentAzIndex = azIndexOfInterface(currentTargets.get(routeTableId as string));
    const desiredAzIndex = healthyZones.includes(homeAzIndex) ? homeAzIndex : (fallback ?? currentAzIndex);
    return { routeTableId: routeTableId as string, homeAzIndex, currentAzIndex, desiredAzIndex };
  });
};

export const runNatFailover = async (topology: NatFailoverTopology, deps: NatFailoverDependencies) => {
  const nowSeconds = deps.now() / 1000;
  const [zoneStates, currentTargets] = await Promise.all([deps.describeZones(topology), deps.describeRoutes(topology)]);
  const zones = zoneStates.map((zone) => evaluateZoneHealth({ zone, nowSeconds }));
  const plan = planRoutes({ topology, zones, currentTargets });
  const summary = zones.map(({ azIndex, healthy, reason }) => `zone ${azIndex}: ${healthy ? 'healthy' : reason}`);
  console.info(`[nat-failover] ${summary.join('; ')}`);

  const changes = plan.filter(
    ({ currentAzIndex, desiredAzIndex }) => desiredAzIndex !== undefined && desiredAzIndex !== currentAzIndex
  );
  for (const change of changes) {
    const target = topology.zones.find(({ azIndex }) => azIndex === change.desiredAzIndex)!;
    console.info(
      `[nat-failover] route table ${change.routeTableId}: zone ${change.currentAzIndex ?? '?'} -> zone ${change.desiredAzIndex}`
    );
    await deps.replaceRoute(change.routeTableId, target.networkInterfaceId as string);
  }

  // One incident per home zone, only for a real failure: a zone between instances during a deploy, a rolling
  // replacement or a lifecycle hook recovers by itself and is not worth a reader's attention. The zone's interface
  // remembers that the incident was opened, so "recovered" is sent exactly once, when the route is home again.
  for (const zone of zones) {
    const home = topology.zones.find(({ azIndex }) => azIndex === zone.azIndex)!;
    const ownTables = plan.filter(({ homeAzIndex }) => homeAzIndex === zone.azIndex);
    const servedElsewhere = ownTables.some(
      ({ desiredAzIndex, currentAzIndex }) => (desiredAzIndex ?? currentAzIndex) !== zone.azIndex
    );
    if (zone.failed && servedElsewhere && !zone.failoverReported) {
      const via = ownTables[0];
      await deps.report({
        type: 'ALARM_TRIGGERED',
        azIndex: zone.azIndex,
        viaAzIndex: via?.desiredAzIndex ?? via?.currentAzIndex,
        reason: zone.reason
      });
      await deps.markReported(home.networkInterfaceId as string, true);
    } else if (zone.healthy && !servedElsewhere && (zone.failoverReported || zone.instanceFailure)) {
      // Home and healthy: close the incident if one was opened, and always clear the instance's failure note so a
      // failure that found no fallback zone cannot turn a later planned replacement into an incident.
      if (zone.failoverReported) {
        await deps.report({ type: 'ALARM_RESOLVED', azIndex: zone.azIndex, reason: zone.reason });
      }
      await deps.markReported(home.networkInterfaceId as string, false);
    }
  }

  // Routes no longer point at the terminating instances' zones (or nothing healthy exists to point them at, in which
  // case waiting changes nothing): let the Auto Scaling group finish.
  for (const zone of zones) {
    for (const instanceId of zone.terminatingInstanceIds) {
      const stillRouted = plan.some(
        ({ desiredAzIndex, currentAzIndex }) => (desiredAzIndex ?? currentAzIndex) === zone.azIndex
      );
      const anyHealthy = zones.some(({ healthy }) => healthy);
      if (stillRouted && anyHealthy) continue;
      const group = topology.zones.find(({ azIndex }) => azIndex === zone.azIndex)!;
      await deps.completeLifecycleAction(group.autoscalingGroupName, instanceId);
    }
  }
  return { zones, plan, changes };
};

const createAwsDependencies = (): NatFailoverDependencies => {
  const ec2 = new EC2Client({});
  const autoscaling = new AutoScalingClient({});
  const ssm = new SSMClient({});
  return {
    now: () => Date.now(),
    describeZones: async (topology) => {
      const [groups, parameters, interfaces] = await Promise.all([
        autoscaling.send(
          new DescribeAutoScalingGroupsCommand({
            AutoScalingGroupNames: topology.zones.map(({ autoscalingGroupName }) => autoscalingGroupName)
          })
        ),
        ssm.send(
          new GetParametersCommand({
            Names: topology.zones.map(({ heartbeatParameterName }) => heartbeatParameterName)
          })
        ),
        ec2.send(
          new DescribeNetworkInterfacesCommand({
            NetworkInterfaceIds: topology.zones.map(({ networkInterfaceId }) => networkInterfaceId as string)
          })
        )
      ]);
      const inServiceIds = (groups.AutoScalingGroups ?? [])
        .flatMap((group) => group.Instances ?? [])
        .filter(({ LifecycleState }) => LifecycleState === 'InService')
        .map(({ InstanceId }) => InstanceId!);
      // An instance can be terminated between the two calls; an unknown status must not stop the whole run.
      const statuses = inServiceIds.length
        ? await ec2
            .send(new DescribeInstanceStatusCommand({ InstanceIds: inServiceIds, IncludeAllInstances: true }))
            .catch((error: unknown) => {
              console.warn(`[nat-failover] instance status unavailable: ${String(error)}`);
              return { InstanceStatuses: [] };
            })
        : { InstanceStatuses: [] };
      return topology.zones.map((zone) => {
        const group = groups.AutoScalingGroups?.find(
          ({ AutoScalingGroupName }) => AutoScalingGroupName === zone.autoscalingGroupName
        );
        const instances = group?.Instances ?? [];
        const serving =
          instances.find(({ LifecycleState }) => LifecycleState === 'InService') ??
          instances.find(({ LifecycleState }) => LifecycleState?.startsWith('Pending'));
        const status = statuses.InstanceStatuses?.find(({ InstanceId }) => InstanceId === serving?.InstanceId);
        const rawHeartbeat = parameters.Parameters?.find(({ Name }) => Name === zone.heartbeatParameterName)?.Value;
        let heartbeat: Heartbeat | undefined;
        try {
          heartbeat = rawHeartbeat ? (JSON.parse(rawHeartbeat) as Heartbeat) : undefined;
        } catch {
          heartbeat = undefined;
        }
        const networkInterface = interfaces.NetworkInterfaces?.find(
          ({ NetworkInterfaceId }) => NetworkInterfaceId === zone.networkInterfaceId
        );
        return {
          azIndex: zone.azIndex,
          failoverReported: networkInterface?.TagSet?.some(
            ({ Key, Value }) => Key === FAILOVER_REPORTED_TAG && Value === 'true'
          ),
          instanceFailure: networkInterface?.TagSet?.find(({ Key }) => Key === INSTANCE_FAILURE_TAG)?.Value,
          instance: serving && {
            instanceId: serving.InstanceId!,
            lifecycleState: serving.LifecycleState!,
            healthStatus: serving.HealthStatus!
          },
          terminatingInstanceIds: instances
            .filter(({ LifecycleState }) => LifecycleState === 'Terminating:Wait')
            .map(({ InstanceId }) => InstanceId!),
          instanceStatusOk: status
            ? status.InstanceState?.Name === 'running' &&
              status.SystemStatus?.Status !== 'impaired' &&
              status.InstanceStatus?.Status !== 'impaired'
            : undefined,
          heartbeat
        };
      });
    },
    describeRoutes: async (topology) => {
      const { RouteTables } = await ec2.send(
        new DescribeRouteTablesCommand({
          RouteTableIds: topology.routeTables.map(({ routeTableId }) => routeTableId as string)
        })
      );
      return new Map(
        (RouteTables ?? []).map((table) => [
          table.RouteTableId!,
          table.Routes?.find(({ DestinationCidrBlock }) => DestinationCidrBlock === INTERNET_CIDR)?.NetworkInterfaceId
        ])
      );
    },
    replaceRoute: async (routeTableId, networkInterfaceId) => {
      await ec2.send(
        new ReplaceRouteCommand({
          RouteTableId: routeTableId,
          DestinationCidrBlock: INTERNET_CIDR,
          NetworkInterfaceId: networkInterfaceId
        })
      );
    },
    completeLifecycleAction: async (autoscalingGroupName, instanceId) => {
      try {
        await autoscaling.send(
          new CompleteLifecycleActionCommand({
            AutoScalingGroupName: autoscalingGroupName,
            LifecycleHookName: LIFECYCLE_HOOK_NAME,
            InstanceId: instanceId,
            LifecycleActionResult: 'CONTINUE'
          })
        );
      } catch (error) {
        // The hook times out on its own (default CONTINUE); a race with that timeout is not a failure.
        console.warn(`[nat-failover] could not complete the lifecycle action of ${instanceId}: ${String(error)}`);
      }
    },
    report: (event) => reportToConsole(event),
    markReported: async (networkInterfaceId, reported) => {
      await ec2.send(
        reported
          ? new CreateTagsCommand({
              Resources: [networkInterfaceId],
              Tags: [{ Key: FAILOVER_REPORTED_TAG, Value: 'true' }]
            })
          : new DeleteTagsCommand({
              Resources: [networkInterfaceId],
              Tags: [{ Key: FAILOVER_REPORTED_TAG }, { Key: INSTANCE_FAILURE_TAG }]
            })
      );
    }
  };
};

const zoneLabel = (azIndex: number) => `zone ${azIndex + 1}`;

/** Plain words for a developer: what happened, what it meant for the app, and that it was handled. */
export const describeFailover = (event: FailoverReport) => {
  const zone = zoneLabel(event.azIndex);
  if (event.type === 'ALARM_RESOLVED') {
    return {
      title: `Outbound internet in availability ${zone} recovered`,
      description: `The NAT instance in availability ${zone} is forwarding traffic again, and the zone's outbound internet traffic goes through it as before. Nothing to do.`
    };
  }
  return {
    title: `Outbound internet in availability ${zone} is going through ${zoneLabel(event.viaAzIndex ?? 0)}`,
    description: `The NAT instance in availability ${zone} stopped forwarding traffic (${event.reason}). Stacktape rerouted that zone's outbound internet traffic through the NAT instance in availability ${zoneLabel(event.viaAzIndex ?? 0)}. Outbound calls from that zone may have failed for up to a minute and open connections were reset. AWS is replacing the instance; traffic goes back once the replacement has verified its internet access. Nothing to do.`
  };
};

const reportToConsole = async (event: FailoverReport) => {
  const apiUrl = process.env.STACKTAPE_TRPC_API_ENDPOINT;
  const region = process.env.AWS_REGION;
  const project = process.env.PROJECT_NAME;
  const stage = process.env.STAGE;
  const stackName = process.env.STACK_NAME;
  if (!apiUrl || !region || !project || !stage) {
    console.warn('[nat-failover] not reporting to the Console: Stacktape environment variables are missing');
    return;
  }
  const { title, description } = describeFailover(event);
  const alarmName = `${NAT_FAILOVER_ALARM_PREFIX}${event.azIndex}`;
  try {
    const client = new AwsIdentityProtectedClient();
    await client.init({ credentials: await defaultProvider()(), region, apiUrl });
    await client.reportAlarmEvent.mutate({
      sourceEventId: `nat-failover:${stackName}:${event.azIndex}:${event.type}:${Date.now()}`,
      type: event.type,
      alarmName,
      sourceConfigName: alarmName,
      triggerType: 'nat-failover',
      project,
      stage,
      region,
      title,
      channels: [],
      details: {
        description,
        time: new Date().toISOString(),
        state: event.type === 'ALARM_TRIGGERED' ? 'ALARM' : 'OK',
        stackName,
        affectedResource: `NAT instance, availability ${zoneLabel(event.azIndex)}`,
        reason: event.reason
      }
    });
  } catch (error) {
    // Routing comes first; a Console outage must not stop the next probe from repairing routes.
    console.warn(`[nat-failover] could not report to the Console: ${String(error)}`);
  }
};

export const isNatFailoverEvent = (event: unknown): event is NatFailoverRuleInput =>
  typeof event === 'object' && event !== null && 'natFailover' in event && typeof event.natFailover === 'object';

export default async (event: NatFailoverRuleInput) => {
  try {
    return await runNatFailover(event.natFailover, createAwsDependencies());
  } catch (error) {
    // While a stack update removes zones or permissions, a probe can hit resources that no longer exist. The next
    // probe is the retry; throwing here would only make EventBridge retry a stale event.
    console.warn(`[nat-failover] skipped this run: ${String(error)}`);
    return undefined;
  }
};
