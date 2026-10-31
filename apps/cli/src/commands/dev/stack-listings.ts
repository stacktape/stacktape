import type { AwsSdkResult } from '@stacktape/aws-read-only/executor';
import { resolveAwsServiceName } from '@stacktape/aws-read-only/operations';

type StackResource = { LogicalResourceId?: string; ResourceType?: string; PhysicalResourceId?: string };

/** Sends one more read of the same service with the same credentials and region. */
type SendRead = (command: string, input: Record<string, unknown>) => Promise<AwsSdkResult>;

const operationName = (command: string) =>
  command.endsWith('Command') ? command.slice(0, -'Command'.length) : command;

const physicalIdsOf = (stackResources: StackResource[], type: string) =>
  stackResources.filter(
    (resource): resource is StackResource & { PhysicalResourceId: string } =>
      resource.ResourceType === type && Boolean(resource.PhysicalResourceId)
  );

/** The function name in a function name, a function ARN or a partial ARN, without a version or alias. */
const functionNameOf = (value: string) => {
  const afterFunction = value.includes(':function:') ? value.split(':function:')[1]! : value;
  return afterFunction.split(':')[0];
};

/** The event bus name in a bus name or ARN; `default` when none is given. */
const eventBusNameOf = (value: unknown) =>
  typeof value === 'string' && value
    ? value.includes(':event-bus/')
      ? value.split(':event-bus/')[1]!
      : value
    : 'default';

/** Reads each resource with `read`, and keeps apart those that could not be read and why. */
const readEach = async <Item extends StackResource>(items: Item[], read: (item: Item) => Promise<AwsSdkResult>) => {
  const found: unknown[] = [];
  const unreadable: Record<string, unknown>[] = [];
  for (const item of items) {
    const result = await read(item);
    if (result.ok) {
      found.push(result.data);
      continue;
    }
    const { code, error } = result as Extract<AwsSdkResult, { ok: false }>;
    unreadable.push({
      LogicalResourceId: item.LogicalResourceId,
      PhysicalResourceId: item.PhysicalResourceId,
      code,
      error
    });
  }
  return { found, unreadable };
};

const withoutMetadata = (data: unknown) => {
  if (!data || typeof data !== 'object') return data;
  const { ResponseMetadata: _metadata, ...rest } = data as Record<string, unknown>;
  return rest;
};

/**
 * Answers the list reads IAM cannot limit to one stack from the stack's own resources, or returns `undefined` for any
 * other call. `aws call` and the dev agent send it before the call itself.
 *
 * - Lambda `ListEventSourceMappings` takes no resource and no condition key, so the agent roles cannot be allowed it
 *   without listing every mapping of the account. It returns the stack's own mappings instead, each read with
 *   `GetEventSourceMapping` (which the roles allow by the stack-name tag), filtered by `FunctionName` and
 *   `EventSourceArn` as AWS filters them. A mapping's state, last processing result and last transition are there.
 * - EventBridge `ListRules` is authorized by the rules of the bus it names (`rule/<bus>/*`). The roles list the stack's
 *   own custom buses; rules on the default bus or on another stack's bus belong to many stacks. For such a bus it
 *   returns the stack's own rules there, each read with `DescribeRule`, filtered by `NamePrefix`.
 */
export const listStackResources = async ({
  service,
  command,
  input,
  stackResources,
  send
}: {
  service: string;
  command: string;
  input: Record<string, unknown>;
  stackResources: StackResource[];
  send: SendRead;
}): Promise<AwsSdkResult | undefined> => {
  const canonicalService = resolveAwsServiceName(service);
  const operation = operationName(command);

  if (canonicalService === 'lambda' && operation === 'ListEventSourceMappings') {
    const mappings = physicalIdsOf(stackResources, 'AWS::Lambda::EventSourceMapping');
    const { found, unreadable } = await readEach(mappings, ({ PhysicalResourceId }) =>
      send('GetEventSourceMapping', { UUID: PhysicalResourceId })
    );
    const functionName = typeof input.FunctionName === 'string' ? functionNameOf(input.FunctionName) : undefined;
    const eventSourceArn = typeof input.EventSourceArn === 'string' ? input.EventSourceArn : undefined;
    const matching = found.map(withoutMetadata).filter((mapping) => {
      const { FunctionArn, EventSourceArn } = (mapping ?? {}) as { FunctionArn?: string; EventSourceArn?: string };
      return (
        (!functionName || (FunctionArn !== undefined && functionNameOf(FunctionArn) === functionName)) &&
        (!eventSourceArn || EventSourceArn === eventSourceArn)
      );
    });
    return {
      ok: true,
      data: {
        EventSourceMappings: matching,
        ...(unreadable.length && { UnreadableEventSourceMappings: unreadable }),
        Note: `This stack's own event source mappings (${mappings.length}), each read with GetEventSourceMapping: IAM cannot limit ListEventSourceMappings to one stack. Read one again with GetEventSourceMapping and its UUID.`
      }
    };
  }

  if (canonicalService === 'eventbridge' && operation === 'ListRules') {
    const eventBusName = eventBusNameOf(input.EventBusName);
    const ownBuses = new Set(
      physicalIdsOf(stackResources, 'AWS::Events::EventBus').map((bus) => bus.PhysicalResourceId)
    );
    if (ownBuses.has(eventBusName)) return undefined;
    // CloudFormation names a rule on a custom bus `<bus>|<rule>`, one on the default bus by its name.
    const namePrefix = typeof input.NamePrefix === 'string' ? input.NamePrefix : '';
    const rules = physicalIdsOf(stackResources, 'AWS::Events::Rule')
      .map((rule) => {
        const [bus, name] = rule.PhysicalResourceId.includes('|')
          ? rule.PhysicalResourceId.split('|')
          : ['default', rule.PhysicalResourceId];
        return { ...rule, bus, name: name! };
      })
      .filter(({ bus, name }) => bus === eventBusName && name.startsWith(namePrefix));
    const { found, unreadable } = await readEach(rules, ({ bus, name }) =>
      send('DescribeRule', { Name: name, ...(bus !== 'default' && { EventBusName: bus }) })
    );
    return {
      ok: true,
      data: {
        Rules: found.map(withoutMetadata),
        ...(unreadable.length && { UnreadableRules: unreadable }),
        Note: `This stack's own rules on event bus ${eventBusName}, each read with DescribeRule: the agent roles list rules only on the stack's own custom event buses${ownBuses.size ? ` (${[...ownBuses].join(', ')})` : ''}. ListTargetsByRule reads a rule's targets.`
      }
    };
  }

  return undefined;
};
