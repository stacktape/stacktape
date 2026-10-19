// Read-only companion for an owned live run. Compare Cloud Map filtering with
// public HTTP throughout rollout/replacement, including an all-unhealthy fleet.
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import {
  ServiceDiscoveryClient,
  GetServiceCommand,
  GetNamespaceCommand,
  DiscoverInstancesCommand
} from '@aws-sdk/client-servicediscovery';
import { ECSClient, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { clients, guard, getStack, endpoint, save, type State } from './run';
import { hostClockMs } from './trace';
import assert from 'node:assert/strict';

const main = async () => {
  await guard();
  const directory = resolve(process.argv[2]!);
  const state = JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')) as State;
  assert.equal(state.account, '597581086285');
  assert.equal(state.region, 'eu-west-1');
  assert.equal(state.profile, 'stacktape-e2e');
  const owned = state.resources[0]!;
  const stack = await getStack(owned);
  assert(stack?.Tags?.some((tag) => tag.Key === 'code-swap-benchmark-owner' && tag.Value === owned.owner));
  const raw = (
    await new DynamoDBClient(clients).send(
      new GetItemCommand({ TableName: owned.table, Key: { pk: { S: 'capacity#plan' } }, ConsistentRead: true })
    )
  ).Item!;
  const plan = JSON.parse(raw.data!.S!) as { services: { node: { cluster: string; serviceArn: string } } };
  const { cluster, serviceArn } = plan.services.node;
  const service = (await new ECSClient(clients).send(new DescribeServicesCommand({ cluster, services: [serviceArn] })))
    .services![0]!;
  const discovery = new ServiceDiscoveryClient(clients);
  const registry = (
    await discovery.send(new GetServiceCommand({ Id: service.serviceRegistries![0]!.registryArn!.split('/').at(-1) }))
  ).Service!;
  const namespace = (await discovery.send(new GetNamespaceCommand({ Id: registry.NamespaceId! }))).Namespace!;
  const namespaceName = namespace.Properties?.HttpProperties?.HttpName ?? namespace.Name!;
  const url = await endpoint(owned);
  const samples: unknown[] = [];
  const until = performance.now() + 900000;
  try {
    while (performance.now() < until) {
      const atHostMs = hostClockMs();
      try {
        const [healthy, orAll] = await Promise.all(
          (['HEALTHY', 'HEALTHY_OR_ELSE_ALL'] as const).map((HealthStatus) =>
            discovery.send(
              new DiscoverInstancesCommand({ NamespaceName: namespaceName, ServiceName: registry.Name!, HealthStatus })
            )
          )
        );
        let http: unknown;
        try {
          const response = await fetch(`${url}/version`, { signal: AbortSignal.timeout(4000) });
          http = {
            status: response.status,
            body: (await response.text()).slice(0, 1024),
            awsMs: Number(response.headers.get('x-lab-now-ms')),
            task: response.headers.get('x-lab-task')
          };
        } catch (error) {
          http = { error: String(error) };
        }
        samples.push({ atHostMs, healthy: healthy!.Instances, healthyOrElseAll: orAll!.Instances, http });
      } catch (error) {
        samples.push({ atHostMs, error: error instanceof Error ? error.name : 'unknown' });
        if (!(await getStack(owned))) break;
      }
      if (samples.length % 10 === 0)
        await save(join(directory, 'discovery-observation.json'), {
          scope: 'Read-only actual CloudMap filtering and public API; host monotonic correlation, errors retained',
          samples
        });
      await Bun.sleep(1000);
    }
  } finally {
    await save(join(directory, 'discovery-observation.json'), {
      scope: 'Read-only actual CloudMap filtering and public API; host monotonic correlation, errors retained',
      samples
    });
  }
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
