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

/**
 * The function and qualifier a `FunctionName` names, in any of its forms: `name`, `name:qualifier`, an ARN or a partial
 * ARN (`account:function:name`), each with or without a version or alias.
 */
const functionReferenceOf = (value: string) => {
  const [name, qualifier] = (value.includes(':function:') ? value.split(':function:')[1]! : value).split(':');
  return { name: name!, qualifier };
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

/** The most mappings one `ListEventSourceMappings` page holds, and how many it holds when `MaxItems` is not given. */
const MAX_LISTED_MAPPINGS = 10_000;
const DEFAULT_LISTED_MAPPINGS = 100;

/**
 * One page of `items` as `ListEventSourceMappings` pages them: at most `MaxItems` (1 to 10 000, default 100), from the
 * `Marker` of the previous page. The marker is the UUID of the page's first mapping; one that names no listed mapping
 * gives an empty page, as AWS gives for a marker it does not know.
 */
const pageOf = (
  items: unknown[],
  input: Record<string, unknown>
): { ok: true; items: unknown[]; nextMarker?: string } | Extract<AwsSdkResult, { ok: false }> => {
  const { MaxItems: maxItems = DEFAULT_LISTED_MAPPINGS, Marker: marker } = input;
  if (!Number.isInteger(maxItems) || (maxItems as number) < 1 || (maxItems as number) > MAX_LISTED_MAPPINGS) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      error: `MaxItems must be a whole number from 1 to ${MAX_LISTED_MAPPINGS}.`
    };
  }
  const uuidOf = (item: unknown) => (item as { UUID?: unknown } | undefined)?.UUID;
  const start = marker === undefined ? 0 : items.findIndex((item) => uuidOf(item) === marker);
  if (start < 0) return { ok: true, items: [] };
  const end = start + (maxItems as number);
  const next = uuidOf(items[end]);
  return { ok: true, items: items.slice(start, end), ...(typeof next === 'string' && { nextMarker: next }) };
};

/**
 * Answers the list reads IAM cannot limit to one stack from the stack's own resources, or returns `undefined` for any
 * other call. `aws call` and the dev agent send it before the call itself.
 *
 * - Lambda `ListEventSourceMappings` takes no resource and no condition key, so the agent roles cannot be allowed it
 *   without listing every mapping of the account. It returns the stack's own mappings instead, each read with
 *   `GetEventSourceMapping` (which the roles allow by the stack-name tag), filtered by `FunctionName` (with its
 *   qualifier) and `EventSourceArn` and paged by `MaxItems` and `Marker` as AWS does. A mapping's state, last
 *   processing result and last transition are there.
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
    // AWS compares the function with the mapping's whole function ARN: a name without a qualifier lists only the
    // mappings of the unqualified function, never those of its aliases or versions (checked 31 Oct 2026).
    const wantedFunction = typeof input.FunctionName === 'string' ? functionReferenceOf(input.FunctionName) : undefined;
    const eventSourceArn = typeof input.EventSourceArn === 'string' ? input.EventSourceArn : undefined;
    const matching = found.map(withoutMetadata).filter((mapping) => {
      const { FunctionArn, EventSourceArn } = (mapping ?? {}) as { FunctionArn?: string; EventSourceArn?: string };
      const mappedFunction = FunctionArn === undefined ? undefined : functionReferenceOf(FunctionArn);
      return (
        (!wantedFunction ||
          (mappedFunction?.name === wantedFunction.name && mappedFunction.qualifier === wantedFunction.qualifier)) &&
        (!eventSourceArn || EventSourceArn === eventSourceArn)
      );
    });
    const page = pageOf(matching, input);
    if (!page.ok) return page;
    return {
      ok: true,
      data: {
        EventSourceMappings: page.items,
        ...(page.nextMarker && { NextMarker: page.nextMarker }),
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
