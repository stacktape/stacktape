/**
 * Dev-box prototype. In a dev stack with `stackConfig.nat: ec2`, the NAT instance also runs a bore-compatible relay
 * (see relay-source.ts). Its control port listens on the instance's loopback, so the laptop reaches it only through an
 * SSM port-forwarding session; tunnel ports listen on the static route-target interface, which VPC Lambdas reach
 * directly. Nothing is exposed on the internet.
 *
 * Flow: wake the Auto Scaling group if it was scaled to zero, wait for the instance in SSM, forward a local port to
 * 127.0.0.1:7835 on the box, and keep that session alive (a new session on the same local port after any exit, so the
 * tunnel manager's reconnect finds it again).
 */
import { appendFileSync } from 'node:fs';
import { connect as connectSocket } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
  SetDesiredCapacityCommand
} from '@aws-sdk/client-auto-scaling';
import { DescribeNetworkInterfacesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { DescribeInstanceInformationCommand, SSMClient } from '@aws-sdk/client-ssm';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { SsmPortForwardingTunnel } from '@utils/ssm-session';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import findFreePorts from 'find-free-ports';
import { createCleanupHook } from '../cleanup-utils';

const RELAY_CONTROL_PORT = 7835;
const WAKE_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_MS = 1000;

export type DevBoxConnection = { controlHost: string; controlPort: number; publicHost: string; instanceId: string };

let session: SsmPortForwardingTunnel | undefined;
let stopped = false;
const startedAt = Date.now();

/** Prototype measurements: every phase is appended to STP_DEV_BOX_TIMINGS_FILE as one JSON line. */
const mark = (phase: string, data: Record<string, unknown> = {}) => {
  const entry = { phase, at: new Date().toISOString(), sinceStartMs: Date.now() - startedAt, ...data };
  tuiManager.info(`[dev-box] ${phase} (+${entry.sinceStartMs} ms)`);
  if (process.env.STP_DEV_BOX_TIMINGS_FILE) appendFileSync(process.env.STP_DEV_BOX_TIMINGS_FILE, `${JSON.stringify(entry)}\n`);
};

export const isDevBoxStack = () =>
  configManager.natSettings.kind === 'instance' && process.env.STACKTAPE_DEV_RELAY !== 'bore';

const clients = () => {
  const args = { region: globalStateManager.region, credentials: awsSdkManager.credentialsProvider };
  return { autoScaling: new AutoScalingClient(args), ec2: new EC2Client(args), ssm: new SSMClient(args) };
};

const stackPhysicalId = (logicalId: string) =>
  stackManager.existingStackResources?.find(({ LogicalResourceId }) => LogicalResourceId === logicalId)
    ?.PhysicalResourceId;

/** Resolves when the relay answers a bore Hello through the forwarded port; the tunnel it opened closes at once. */
const relayAnswers = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = connectSocket({ host: '127.0.0.1', port });
    let buffer = '';
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), 5000);
    socket.once('connect', () => socket.write(`${JSON.stringify({ Hello: 0 })}\0`));
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      if (buffer.includes('"Hello"')) {
        clearTimeout(timer);
        done(true);
      }
    });
    socket.once('error', () => {
      clearTimeout(timer);
      done(false);
    });
    socket.once('close', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });

const waitForInstance = async (autoScalingGroupName: string) => {
  const { autoScaling, ssm } = clients();
  const deadline = Date.now() + WAKE_TIMEOUT_MS;
  let instanceId: string | undefined;
  while (Date.now() < deadline) {
    const { AutoScalingGroups } = await autoScaling.send(
      new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [autoScalingGroupName] })
    );
    const group = AutoScalingGroups?.[0];
    if (!group) throw new Error(`Dev box Auto Scaling group ${autoScalingGroupName} does not exist.`);
    const inService = group.Instances?.find(({ LifecycleState }) => LifecycleState === 'InService');
    if (inService?.InstanceId) {
      if (instanceId !== inService.InstanceId) mark('instance-in-service', { instanceId: inService.InstanceId });
      instanceId = inService.InstanceId;
      const { InstanceInformationList } = await ssm.send(
        new DescribeInstanceInformationCommand({ Filters: [{ Key: 'InstanceIds', Values: [instanceId] }] })
      );
      if (InstanceInformationList?.[0]?.PingStatus === 'Online') {
        mark('ssm-online', { instanceId });
        return instanceId;
      }
    }
    await delay(POLL_MS);
  }
  throw new Error('The dev box did not come online within 10 minutes.');
};

const openSession = async ({ instanceId, localPort }: { instanceId: string; localPort: number }) => {
  const tunnel = new SsmPortForwardingTunnel({
    localPort,
    targetInfo: {
      bastionInstanceId: instanceId,
      remoteHost: '127.0.0.1',
      remotePort: RELAY_CONTROL_PORT,
      label: 'dev box relay',
      targetStpName: 'devBox'
    }
  });
  await tunnel.connect();
  return tunnel;
};

/** Reopens the SSM session on the same local port whenever it ends, until dev mode stops. */
const superviseSession = (instanceId: string, localPort: number) => {
  void (async () => {
    while (!stopped && session) {
      await session.waitForExit();
      if (stopped) return;
      mark('ssm-session-exited');
      // The server side outlives a killed plugin and keeps the old relay connections open; end it first.
      await session.kill().catch(() => undefined);
      for (let attempt = 1; !stopped; attempt++) {
        try {
          session = await openSession({ instanceId, localPort });
          mark('ssm-session-reopened', { attempt });
          break;
        } catch (error) {
          tuiManager.warn(`[dev-box] reopening the SSM session failed: ${error instanceof Error ? error.message : error}`);
          await delay(Math.min(1000 * attempt, 5000));
        }
      }
    }
  })();
};

export const connectDevBox = async (): Promise<DevBoxConnection> => {
  const { stackName } = globalStateManager.targetStack;
  const autoScalingGroupName = awsResourceNames.natInstanceAutoscalingGroup({ stackName, azIndex: 0 });
  const { autoScaling, ec2 } = clients();
  mark('connect-start');

  const { AutoScalingGroups } = await autoScaling.send(
    new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [autoScalingGroupName] })
  );
  if (AutoScalingGroups?.[0]?.DesiredCapacity === 0) {
    await autoScaling.send(
      new SetDesiredCapacityCommand({ AutoScalingGroupName: autoScalingGroupName, DesiredCapacity: 1 })
    );
    mark('wake-requested');
  }

  const networkInterfaceId = stackPhysicalId(cfLogicalNames.natInstanceNetworkInterface(0));
  if (!networkInterfaceId) throw new Error('The dev stack has no NAT instance interface.');
  const { NetworkInterfaces } = await ec2.send(
    new DescribeNetworkInterfacesCommand({ NetworkInterfaceIds: [networkInterfaceId] })
  );
  const publicHost = NetworkInterfaces?.[0]?.PrivateIpAddress;
  if (!publicHost) throw new Error(`Interface ${networkInterfaceId} has no private IP.`);

  const instanceId = await waitForInstance(autoScalingGroupName);
  const [localPort] = await findFreePorts(1);
  session = await openSession({ instanceId, localPort });
  mark('ssm-session-open', { localPort });

  const deadline = Date.now() + WAKE_TIMEOUT_MS;
  while (!(await relayAnswers(localPort))) {
    if (Date.now() > deadline) throw new Error('The dev box relay did not answer through SSM.');
    await delay(POLL_MS);
  }
  mark('relay-ready', { instanceId, relayHost: publicHost });
  superviseSession(instanceId, localPort);
  return { controlHost: '127.0.0.1', controlPort: localPort, publicHost, instanceId };
};

export const registerDevBoxCleanupHook = createCleanupHook('dev-box', async () => {
  stopped = true;
  await session?.kill().catch(() => undefined);
  session = undefined;
});
