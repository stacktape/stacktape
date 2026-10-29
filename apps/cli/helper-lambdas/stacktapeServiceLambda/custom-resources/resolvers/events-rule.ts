import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { Target } from '@aws-sdk/client-eventbridge';
import {
  DeleteRuleCommand,
  DescribeRuleCommand,
  EventBridgeClient,
  ListTagsForResourceCommand,
  ListTargetsByRuleCommand,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
  TagResourceCommand,
  UntagResourceCommand
} from '@aws-sdk/client-eventbridge';
import { errorName, withPermissionRetry, withPhysicalResourceId } from './service-lambda-created-resources';

type EventsRuleProps = NonNullable<StpServiceCustomResourceProperties['eventsRule']>;
type TargetProps = Record<string, unknown>;

/**
 * The event bus name, or `undefined` for the default bus. Templates name a bus of the same stack by ARN
 * (`Fn::GetAtt` `Arn`); a rule can only be on a bus of its own account, so its name identifies it.
 */
const eventBusNameOf = (props: EventsRuleProps) => {
  const value = props.EventBusName === undefined ? undefined : String(props.EventBusName);
  const name = value?.startsWith('arn:') ? value.slice(value.indexOf(':event-bus/') + ':event-bus/'.length) : value;
  return name === undefined || name === 'default' ? undefined : name;
};

/** What `Ref` of `AWS::Events::Rule` returns: the name, or `<bus>|<name>` on another bus. */
const physicalIdOf = (props: EventsRuleProps) =>
  eventBusNameOf(props) ? `${eventBusNameOf(props)}|${String(props.Name)}` : String(props.Name);

const parsePhysicalId = (physicalId: string) => {
  const separator = physicalId.lastIndexOf('|');
  return separator === -1
    ? { name: physicalId, eventBusName: undefined }
    : { name: physicalId.slice(separator + 1), eventBusName: physicalId.slice(0, separator) };
};

const toNumber = (value: unknown) => (value === undefined ? undefined : Number(value));

/** A target as `PutTargets` takes it. CloudFormation passes the numbers of a custom resource as strings. */
export const toTarget = (target: TargetProps): Target => {
  const retryPolicy = target.RetryPolicy as Record<string, unknown> | undefined;
  const inputTransformer = target.InputTransformer as Record<string, unknown> | undefined;
  return {
    Id: String(target.Id),
    Arn: String(target.Arn),
    ...(target.Input !== undefined && { Input: String(target.Input) }),
    ...(target.InputPath !== undefined && { InputPath: String(target.InputPath) }),
    ...(inputTransformer && {
      InputTransformer: {
        InputTemplate: String(inputTransformer.InputTemplate),
        ...(inputTransformer.InputPathsMap !== undefined && {
          InputPathsMap: inputTransformer.InputPathsMap as Record<string, string>
        })
      }
    }),
    ...(target.DeadLetterConfig !== undefined && {
      DeadLetterConfig: { Arn: String((target.DeadLetterConfig as { Arn: unknown }).Arn) }
    }),
    ...(retryPolicy && {
      RetryPolicy: {
        MaximumEventAgeInSeconds: toNumber(retryPolicy.MaximumEventAgeInSeconds),
        MaximumRetryAttempts: toNumber(retryPolicy.MaximumRetryAttempts)
      }
    }),
    ...(target.SqsParameters !== undefined && {
      SqsParameters: { MessageGroupId: String((target.SqsParameters as { MessageGroupId: unknown }).MessageGroupId) }
    })
  };
};

const getTags = (props: EventsRuleProps) =>
  ((props.Tags as { Key: string; Value: string }[] | undefined) ?? []).map(({ Key, Value }) => ({
    Key,
    Value: String(Value)
  }));

const isMissingRule = (error: unknown) => errorName(error) === 'ResourceNotFound';

const putRule = async (events: EventBridgeClient, props: EventsRuleProps, withTags: boolean) => {
  const { RuleArn } = await withPermissionRetry(() =>
    events.send(
      new PutRuleCommand({
        Name: String(props.Name),
        ...(eventBusNameOf(props) && { EventBusName: eventBusNameOf(props) }),
        ...(props.EventPattern !== undefined && {
          EventPattern: typeof props.EventPattern === 'string' ? props.EventPattern : JSON.stringify(props.EventPattern)
        }),
        ...(props.ScheduleExpression !== undefined && { ScheduleExpression: String(props.ScheduleExpression) }),
        ...(props.State !== undefined && { State: String(props.State) as 'ENABLED' }),
        ...(props.Description !== undefined && { Description: String(props.Description) }),
        ...(withTags && getTags(props).length && { Tags: getTags(props) })
      })
    )
  );
  return RuleArn as string;
};

const listTargetIds = async (events: EventBridgeClient, name: string, eventBusName: string | undefined) => {
  const ids: string[] = [];
  let NextToken: string | undefined;
  do {
    const page = await events.send(new ListTargetsByRuleCommand({ Rule: name, EventBusName: eventBusName, NextToken }));
    ids.push(...(page.Targets ?? []).map(({ Id }) => Id as string));
    NextToken = page.NextToken;
  } while (NextToken);
  return ids;
};

const failIfEntriesFailed = (
  operation: string,
  response: { FailedEntryCount?: number; FailedEntries?: { TargetId?: string; ErrorMessage?: string }[] }
) => {
  if (!response.FailedEntryCount) return;
  const details = (response.FailedEntries ?? []).map((entry) => `${entry.TargetId}: ${entry.ErrorMessage}`).join('; ');
  throw new Error(`EventBridge ${operation} failed for ${response.FailedEntryCount} target(s): ${details}`);
};

const putTargets = async (events: EventBridgeClient, props: EventsRuleProps) => {
  const name = String(props.Name);
  const eventBusName = eventBusNameOf(props);
  const targets = ((props.Targets as TargetProps[] | undefined) ?? []).map(toTarget);
  const existing = await listTargetIds(events, name, eventBusName);
  const removed = existing.filter((id) => !targets.some((target) => target.Id === id));
  for (let index = 0; index < removed.length; index += 100) {
    failIfEntriesFailed(
      'RemoveTargets',
      await events.send(
        new RemoveTargetsCommand({ Rule: name, EventBusName: eventBusName, Ids: removed.slice(index, index + 100) })
      )
    );
  }
  for (let index = 0; index < targets.length; index += 10) {
    failIfEntriesFailed(
      'PutTargets',
      await events.send(
        new PutTargetsCommand({ Rule: name, EventBusName: eventBusName, Targets: targets.slice(index, index + 10) })
      )
    );
  }
};

const updateTags = async (events: EventBridgeClient, ruleArn: string, props: EventsRuleProps) => {
  const wanted = getTags(props);
  const { Tags: current = [] } = await events.send(new ListTagsForResourceCommand({ ResourceARN: ruleArn }));
  const removed = current.filter(({ Key }) => !wanted.some((tag) => tag.Key === Key)).map(({ Key }) => Key as string);
  if (removed.length) await events.send(new UntagResourceCommand({ ResourceARN: ruleArn, TagKeys: removed }));
  const changed = wanted.filter(({ Key, Value }) => !current.some((tag) => tag.Key === Key && tag.Value === Value));
  if (changed.length) await events.send(new TagResourceCommand({ ResourceARN: ruleArn, Tags: changed }));
};

const deleteRule = async (events: EventBridgeClient, physicalId: string) => {
  const { name, eventBusName } = parsePhysicalId(physicalId);
  try {
    const ids = await withPermissionRetry(() => listTargetIds(events, name, eventBusName));
    for (let index = 0; index < ids.length; index += 100) {
      failIfEntriesFailed(
        'RemoveTargets',
        await events.send(
          new RemoveTargetsCommand({ Rule: name, EventBusName: eventBusName, Ids: ids.slice(index, index + 100) })
        )
      );
    }
    await events.send(new DeleteRuleCommand({ Name: name, EventBusName: eventBusName }));
  } catch (error) {
    if (!isMissingRule(error)) throw error;
  }
};

const ruleExists = async (events: EventBridgeClient, props: EventsRuleProps) => {
  try {
    await withPermissionRetry(() =>
      events.send(new DescribeRuleCommand({ Name: String(props.Name), EventBusName: eventBusNameOf(props) }))
    );
    return true;
  } catch (error) {
    if (isMissingRule(error)) return false;
    throw error;
  }
};

const createRule = async (events: EventBridgeClient, props: EventsRuleProps) => {
  const physicalId = physicalIdOf(props);
  // `PutRule` updates an existing rule. A custom resource must not take over a rule it did not create.
  if (await ruleExists(events, props)) {
    throw new Error(`EventBridge rule ${physicalId} already exists.`);
  }
  const ruleArn = await putRule(events, props, true);
  try {
    await putTargets(events, props);
  } catch (error) {
    await deleteRule(events, physicalId).catch((cleanupError) => console.error(cleanupError));
    throw withPhysicalResourceId(error, physicalId);
  }
  return { data: { Arn: ruleArn }, physicalResourceId: physicalId };
};

/**
 * Creates, updates and deletes an EventBridge rule for the `Custom::StpEventsRule` resource that replaces
 * `AWS::Events::Rule` for rules new to a stack. CloudFormation's own handler waits about 30 s after `PutRule` and
 * another 30 s after `PutTargets`; EventBridge applies both at once. Stacks keep rules already deployed as
 * `AWS::Events::Rule` in that form.
 *
 * The physical ID is what `Ref` of `AWS::Events::Rule` returns, and `Arn` is the same attribute. A new name or event
 * bus creates a new rule; CloudFormation then deletes the old one, as it replaces an `AWS::Events::Rule`.
 */
export const eventsRule: ServiceLambdaResolver<EventsRuleProps> = async (
  currentProps,
  previousProps,
  operation,
  physicalResourceId
) => {
  const events = new EventBridgeClient({});
  if (operation === 'Delete') {
    // A create that failed before it reached EventBridge leaves the framework's placeholder ID.
    if (physicalResourceId && physicalResourceId === physicalIdOf(currentProps)) {
      await deleteRule(events, physicalResourceId);
    }
    return { data: {}, physicalResourceId };
  }
  if (operation === 'Create' || physicalResourceId !== physicalIdOf(currentProps)) {
    return createRule(events, currentProps);
  }
  const ruleArn = await putRule(events, currentProps, false);
  await putTargets(events, currentProps);
  await updateTags(events, ruleArn, currentProps);
  return { data: { Arn: ruleArn }, physicalResourceId: physicalResourceId as string };
};
