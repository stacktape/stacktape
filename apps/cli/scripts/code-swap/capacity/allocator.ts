// Benchmark-only allocator. No routing, deployment, signing or release writes.
import {
  DynamoDBClient,
  GetItemCommand,
  BatchGetItemCommand,
  TransactWriteItemsCommand,
  type AttributeValue
} from '@aws-sdk/client-dynamodb';
import { ECSClient, DescribeTasksCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { z } from 'zod';

const serviceSchema = z.object({
  cluster: z.string(),
  serviceArn: z.string(),
  roleId: z.string().regex(/^AROA[A-Z0-9]+$/),
  start: z.number().int().min(0),
  slots: z.number().int().positive()
});
export const planSchema = z
  .object({
    version: z.string().min(1),
    deleting: z.boolean(),
    account: z.string().regex(/^\d{12}$/),
    region: z.literal('eu-west-1'),
    services: z.record(z.string(), serviceSchema)
  })
  .superRefine((plan, ctx) => {
    const used = new Set<number>();
    for (const service of Object.values(plan.services))
      for (let slot = service.start; slot < service.start + service.slots; slot++) {
        if (slot >= 450 || used.has(slot))
          ctx.addIssue({ code: 'custom', message: 'Capacity plan overlaps or exceeds 450 declared slots.' });
        used.add(slot);
      }
  });
type Plan = z.infer<typeof planSchema>;
type Item = Record<string, AttributeValue>;
const grantSchema = z.object({
  owner: z.string().regex(/^status#[a-zA-Z0-9_-]+#AROA[A-Z0-9]+:[a-f0-9]{32}$/),
  service: z.string(),
  task: z.string().regex(/^[a-f0-9]{32}$/),
  cluster: z.string(),
  slot: z.number().int().min(0).max(499),
  token: z.uuid(),
  requestedAtMs: z.number().finite().optional()
});
export type Grant = z.infer<typeof grantSchema>;
const string = (S: string): AttributeValue => ({ S });
const key = (pk: string) => ({ pk: string(pk) });
const grantKey = (owner: string) => owner.replace(/^status#/, 'admission#');
const terminalKey = (owner: string) => owner.replace(/^status#/, 'stopped#');
const conditional = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  if (error.name === 'ConditionalCheckFailedException') return true;
  if (error.name !== 'TransactionCanceledException') return false;
  const parsed = z.object({ CancellationReasons: z.array(z.object({ Code: z.string().optional() })) }).safeParse(error);
  // A transaction conflict/outage must be retried, not acknowledged as a lost
  // ownership race. In particular STOPPED delivery must not silently leak slots.
  return (
    parsed.success &&
    parsed.data.CancellationReasons.some((reason) => reason.Code === 'ConditionalCheckFailed') &&
    parsed.data.CancellationReasons.every(
      (reason) => !reason.Code || ['None', 'ConditionalCheckFailed'].includes(reason.Code)
    )
  );
};
const decodeGrant = (item?: Item): Grant | undefined =>
  item?.data?.S ? grantSchema.parse(JSON.parse(item.data.S)) : undefined;

export class Allocator {
  constructor(
    readonly table: string,
    readonly ddb: DynamoDBClient,
    readonly ecs: ECSClient
  ) {}
  async get(pk: string) {
    return (await this.ddb.send(new GetItemCommand({ TableName: this.table, Key: key(pk), ConsistentRead: true })))
      .Item;
  }
  async plan(): Promise<Plan> {
    const item = await this.get('capacity#plan');
    const plan = planSchema.parse(JSON.parse(item?.data?.S ?? 'null'));
    if (plan.deleting || item?.deleting?.BOOL !== false || item?.version?.S !== plan.version)
      throw new Error('Capacity plan unavailable or deleting.');
    return plan;
  }
  planCondition(plan: Plan) {
    return {
      ConditionCheck: {
        TableName: this.table,
        Key: key('capacity#plan'),
        ConditionExpression: '#v = :v AND deleting = :no',
        ExpressionAttributeNames: { '#v': 'version' },
        ExpressionAttributeValues: { ':v': string(plan.version), ':no': { BOOL: false } }
      }
    };
  }
  async allocate(owner: string, requestedAtMs?: number): Promise<Grant | undefined> {
    const match = /^status#([a-zA-Z0-9_-]+)#(AROA[A-Z0-9]+):([a-f0-9]{32})$/.exec(owner);
    if (!match) throw new InvalidRequest('Malformed protected status key.');
    const name = match[1]!,
      role = match[2]!,
      task = match[3]!;
    const plan = await this.plan();
    const service = plan.services[name];
    if (!service || service.roleId !== role) throw new InvalidRequest('Unknown service/role.');
    const existing = decodeGrant(await this.get(grantKey(owner)));
    if (existing) {
      if (existing.owner !== owner || existing.task !== task) throw new Error('Protected admission identity mismatch.');
      return existing;
    }
    if (await this.get(terminalKey(owner))) return undefined;
    const [tasks, services] = await Promise.all([
      this.ecs.send(new DescribeTasksCommand({ cluster: service.cluster, tasks: [task] })),
      this.ecs.send(new DescribeServicesCommand({ cluster: service.cluster, services: [service.serviceArn] }))
    ]);
    const live = tasks.tasks?.[0],
      current = services.services?.[0];
    if (
      tasks.failures?.length ||
      services.failures?.length ||
      tasks.tasks?.length !== 1 ||
      !live ||
      !current ||
      live.taskArn?.split('/').at(-1) !== task ||
      live.desiredStatus !== 'RUNNING' ||
      !['PROVISIONING', 'PENDING', 'ACTIVATING', 'RUNNING'].includes(live.lastStatus ?? '') ||
      live.group !== `service:${service.serviceArn.split('/').at(-1)}` ||
      !current.deployments?.some((deployment) => deployment.taskDefinition === live.taskDefinitionArn)
    )
      throw new InvalidRequest('Task is not a live member of an allowed service revision.');
    const slots = [
      ...Array.from({ length: service.slots }, (_, i) => service.start + i),
      ...Array.from({ length: 50 }, (_, i) => 450 + i)
    ];
    // Rotate by task ID to avoid a single transactional hot slot on concurrent starts.
    const offset = parseInt(task.slice(-8), 16) % slots.length;
    // The common startup path probes a handful of atomic slots without reading
    // the whole ledger. A full snapshot/reconciliation is reserved for pressure.
    for (let attempt = 0; attempt < 3; attempt++) {
      const occupied = new Map((attempt === 0 ? [] : await this.slots()).map((grant) => [grant.slot, grant]));
      for (let i = 0; i < (attempt === 0 ? Math.min(8, slots.length) : slots.length); i++) {
        const slot = slots[(i + offset) % slots.length]!;
        if (occupied.has(slot)) continue;
        const grant: Grant = {
          owner,
          service: name,
          task,
          cluster: service.cluster,
          slot,
          token: crypto.randomUUID(),
          requestedAtMs
        };
        const item = { ...key(`slot#${slot}`), data: string(JSON.stringify(grant)), token: string(grant.token) };
        try {
          await this.ddb.send(
            new TransactWriteItemsCommand({
              TransactItems: [
                this.planCondition(plan),
                {
                  ConditionCheck: {
                    TableName: this.table,
                    Key: key(terminalKey(owner)),
                    ConditionExpression: 'attribute_not_exists(pk)'
                  }
                },
                { Put: { TableName: this.table, Item: item, ConditionExpression: 'attribute_not_exists(pk)' } },
                {
                  Put: {
                    TableName: this.table,
                    Item: { ...item, ...key(grantKey(owner)) },
                    ConditionExpression: 'attribute_not_exists(pk) OR attribute_exists(refusal)'
                  }
                }
              ]
            })
          );
          return grant;
        } catch (error) {
          // A lost response or competing duplicate must consume exactly one slot.
          const found = decodeGrant(await this.get(grantKey(owner)));
          if (found) return found;
          if (!conditional(error)) throw error;
        }
      }
      if (attempt === 1) await this.reclaim(plan);
    }
    try {
      await this.ddb.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            this.planCondition(plan),
            {
              ConditionCheck: {
                TableName: this.table,
                Key: key(terminalKey(owner)),
                ConditionExpression: 'attribute_not_exists(pk)'
              }
            },
            {
              Put: {
                TableName: this.table,
                Item: { ...key(grantKey(owner)), refusal: string('poller_capacity_exceeded') },
                ConditionExpression: 'attribute_not_exists(pk) OR attribute_exists(refusal)'
              }
            }
          ]
        })
      );
    } catch (error) {
      const found = decodeGrant(await this.get(grantKey(owner)));
      if (found) return found;
      if (!conditional(error)) throw error;
    }
    return undefined;
  }
  async slots(): Promise<Grant[]> {
    const result: Grant[] = [];
    await Promise.all(
      Array.from({ length: 5 }, async (_, batch) => {
        const start = batch * 100;
        let keys: Record<string, AttributeValue>[] = Array.from({ length: 100 }, (_, i) => key(`slot#${start + i}`));
        for (let retry = 0; keys.length; retry++) {
          if (retry === 5) throw new Error('Capacity slot reads remained unprocessed.');
          const response = await this.ddb.send(
            new BatchGetItemCommand({ RequestItems: { [this.table]: { Keys: keys, ConsistentRead: true } } })
          );
          for (const item of response.Responses?.[this.table] ?? []) {
            const grant = decodeGrant(item);
            if (grant) {
              if (item.pk?.S !== `slot#${grant.slot}` || item.token?.S !== grant.token)
                throw new Error('Protected slot identity mismatch.');
              result.push(grant);
            }
          }
          keys = response.UnprocessedKeys?.[this.table]?.Keys ?? [];
        }
      })
    );
    return result;
  }
  async release(plan: Plan, grant: Grant) {
    // The admission, slot and terminal evidence change atomically. A delayed
    // worker's old token cannot free a slot subsequently assigned to someone else.
    try {
      await this.ddb.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            this.planCondition(plan),
            {
              Delete: {
                TableName: this.table,
                Key: key(`slot#${grant.slot}`),
                ConditionExpression: '#t = :t',
                ExpressionAttributeNames: { '#t': 'token' },
                ExpressionAttributeValues: { ':t': string(grant.token) }
              }
            },
            {
              Delete: {
                TableName: this.table,
                Key: key(grantKey(grant.owner)),
                ConditionExpression: '#t = :t',
                ExpressionAttributeNames: { '#t': 'token' },
                ExpressionAttributeValues: { ':t': string(grant.token) }
              }
            },
            { Put: { TableName: this.table, Item: { ...key(terminalKey(grant.owner)), task: string(grant.task) } } }
          ]
        })
      );
    } catch (error) {
      if (!conditional(error)) throw error;
    }
  }
  async reclaim(plan: Plan) {
    const grants = await this.slots();
    for (const cluster of new Set(grants.map((grant) => grant.cluster))) {
      const owned = grants.filter((grant) => grant.cluster === cluster);
      for (let i = 0; i < owned.length; i += 100) {
        const batch = owned.slice(i, i + 100);
        const response = await this.ecs.send(
          new DescribeTasksCommand({ cluster, tasks: batch.map((grant) => grant.task) })
        );
        const confirmed = batch.filter((grant) =>
          response.tasks?.some(
            (task) => task.taskArn?.split('/').at(-1) === grant.task && task.lastStatus === 'STOPPED'
          )
        );
        for (let offset = 0; offset < confirmed.length; offset += 10)
          await Promise.all(confirmed.slice(offset, offset + 10).map((grant) => this.release(plan, grant)));
        // Missing/aged-out identities retain their slot, including MISSING failures.
      }
    }
  }
  async stopped(event: StoppedEvent) {
    const plan = await this.plan();
    if (
      event.source !== 'aws.ecs' ||
      event['detail-type'] !== 'ECS Task State Change' ||
      event.account !== plan.account ||
      event.region !== plan.region ||
      event.detail.lastStatus !== 'STOPPED'
    )
      throw new InvalidRequest('Untrusted terminal event.');
    const task = event.detail.taskArn.split('/').at(-1)!;
    for (const [name, service] of Object.entries(plan.services)) {
      if (
        event.detail.clusterArn !== service.cluster ||
        event.detail.group !== `service:${service.serviceArn.split('/').at(-1)}`
      )
        continue;
      const owner = `status#${name}#${service.roleId}:${task}`;
      const grant = decodeGrant(await this.get(grantKey(owner)));
      if (grant) await this.release(plan, grant);
      else {
        // Persist a stop preceding an in-flight allocation, so an old worker
        // cannot allocate a new grant for an already terminal task.
        await this.ddb.send(
          new TransactWriteItemsCommand({
            TransactItems: [
              this.planCondition(plan),
              { Put: { TableName: this.table, Item: { ...key(terminalKey(owner)), task: string(task) } } }
            ]
          })
        );
        const raced = decodeGrant(await this.get(grantKey(owner)));
        if (raced) await this.release(plan, raced);
      }
      return;
    }
    throw new InvalidRequest('Foreign stopped task.');
  }
}
export class InvalidRequest extends Error {}
export type StoppedEvent = {
  source: string;
  'detail-type': string;
  account: string;
  region: string;
  detail: { lastStatus: string; taskArn: string; clusterArn: string; group: string };
};
