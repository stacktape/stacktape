import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import {
  STP_EVENTS_RULE_TYPE,
  STP_SQS_QUEUE_POLICY_TYPE,
  STP_SQS_QUEUE_TYPE,
  SUPPORTED_EVENTS_RULE_PROPERTIES,
  SUPPORTED_EVENTS_RULE_TARGET_PROPERTIES,
  SUPPORTED_SQS_QUEUE_POLICY_PROPERTIES,
  SUPPORTED_SQS_QUEUE_PROPERTIES
} from '@helper-lambdas/stacktapeServiceLambda/custom-resources/created-resource-properties';
import { getAtt, isIntrinsic, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { CliError } from '@utils/errors';
import { transformIntoCloudformationSubstitutedString } from '@utils/cloudformation';

type TemplateResource = CloudFormationTemplate['Resources'][string];

/** The service Lambda role's policy for the queues, queue policies and rules it creates. */
export const SERVICE_LAMBDA_CREATED_RESOURCES_POLICY_NAME = 'stacktape-created-queues-and-rules';

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const containsText = (value: unknown, text: string): boolean => {
  if (typeof value === 'string') return value.includes(text);
  if (Array.isArray(value)) return value.some((item) => containsText(item, text));
  if (isObject(value))
    return Object.entries(value).some(([key, item]) => key.includes(text) || containsText(item, text));
  return false;
};

const containsIntrinsic = (value: unknown): boolean => {
  if (isObject(value) && isIntrinsic(value)) return true;
  if (Array.isArray(value)) return value.some(containsIntrinsic);
  if (isObject(value)) return Object.values(value).some(containsIntrinsic);
  return false;
};

/**
 * Whether every reference in the value is an `Fn::GetAtt`, or a `Ref` to a resource of the template or a pseudo
 * parameter. These resolve to identifiers (ARNs, names, URLs) that need no escaping in JSON text and are strings in
 * either form, so the text means the same as the native value. Anything else, such as `Fn::If` choosing a number, does
 * not qualify.
 */
const hasOnlyIdentifierReferences = (value: unknown, resourceIds: ReadonlySet<string>): boolean => {
  if (Array.isArray(value)) return value.every((item) => hasOnlyIdentifierReferences(item, resourceIds));
  if (!isObject(value)) return true;
  if (isIntrinsic(value)) {
    const keys = Object.keys(value);
    if (keys.length !== 1) return false;
    if (keys[0] === 'Fn::GetAtt') return true;
    const target = (value as { Ref?: unknown }).Ref;
    return typeof target === 'string' && (target.startsWith('AWS::') || resourceIds.has(target));
  }
  return Object.values(value).every((item) => hasOnlyIdentifierReferences(item, resourceIds));
};

/**
 * A JSON document as text: CloudFormation passes the values of a custom resource as strings, which would change the
 * meaning of numbers and booleans in an event pattern or a policy. References become an `Fn::Sub` string. Returns
 * `undefined` for a value that cannot be written that way: an intrinsic in place of the whole document, a reference
 * that could resolve to something other than an identifier, or text that `Fn::Sub` would read as a reference (`${...}`,
 * such as an IAM policy variable).
 */
const toJsonText = (value: unknown, resourceIds: ReadonlySet<string>): unknown => {
  if (typeof value === 'string') return value;
  if (!isObject(value) || isIntrinsic(value)) return undefined;
  if (!containsIntrinsic(value)) return JSON.stringify(value);
  if (!hasOnlyIdentifierReferences(value, resourceIds) || containsText(value, '${')) return undefined;
  return transformIntoCloudformationSubstitutedString(value);
};

/**
 * The properties the service Lambda creates the queue from, or why the queue keeps `AWS::SQS::Queue`. The queue name
 * must start with the stack name: the service Lambda may only manage the stack's own queues.
 */
const getQueueProps = (resource: TemplateResource, stackName: string): Record<string, unknown> | string => {
  const properties = (resource.Properties ?? {}) as Record<string, unknown>;
  const unsupported = Object.keys(properties).filter((key) => !SUPPORTED_SQS_QUEUE_PROPERTIES.has(key));
  if (unsupported.length) return `unsupported properties ${unsupported.join(', ')}`;
  if (typeof properties.QueueName !== 'string' || !properties.QueueName.startsWith(`${stackName}-`)) {
    return `the queue name does not start with "${stackName}-"`;
  }
  return properties;
};

/**
 * The properties the service Lambda creates the rule from, or why the rule keeps `AWS::Events::Rule`. CloudFormation
 * passes custom resource values as strings, which would change the meaning of numbers and booleans in an event pattern,
 * so the pattern is sent as JSON text.
 */
const getRuleProps = ({
  resource,
  stackName,
  cfLogicalName,
  tags,
  resourceIds
}: {
  resource: TemplateResource;
  stackName: string;
  cfLogicalName: string;
  tags: { Key: string; Value: string }[];
  resourceIds: ReadonlySet<string>;
}): Record<string, unknown> | string => {
  const properties = (resource.Properties ?? {}) as Record<string, unknown>;
  const unsupported = Object.keys(properties).filter((key) => !SUPPORTED_EVENTS_RULE_PROPERTIES.has(key));
  if (unsupported.length) return `unsupported properties ${unsupported.join(', ')}`;
  const targets = properties.Targets ?? [];
  if (!Array.isArray(targets) || targets.some((target) => !isObject(target) || isIntrinsic(target))) {
    return 'targets that are not a plain list';
  }
  const unsupportedTargetProperties = targets.flatMap((target) =>
    Object.keys(target).filter((key) => !SUPPORTED_EVENTS_RULE_TARGET_PROPERTIES.has(key))
  );
  if (unsupportedTargetProperties.length)
    return `unsupported target properties ${unsupportedTargetProperties.join(', ')}`;
  const name = awsResourceNames.serviceLambdaEventsRule(stackName, cfLogicalName);
  if (!name.startsWith(`${stackName}-`)) return `the stack name is too long for a rule name`;
  let eventPattern = properties.EventPattern;
  if (eventPattern !== undefined) {
    eventPattern = toJsonText(eventPattern, resourceIds);
    if (eventPattern === undefined) return 'an event pattern that cannot be sent as JSON text';
  }
  return {
    ...properties,
    ...(eventPattern !== undefined && { EventPattern: eventPattern }),
    Name: name,
    ...(tags.length && { Tags: tags })
  };
};

/** The name of the queue a `Ref` in a queue policy's `Queues` points to, in either form, if the stack creates it. */
const getReferencedQueueName = (template: CloudFormationTemplate, value: unknown): string | undefined => {
  const logicalName = isObject(value) ? value.Ref : undefined;
  if (typeof logicalName !== 'string') return undefined;
  const queue = template.Resources[logicalName];
  const properties = queue?.Properties as Record<string, unknown> | undefined;
  const name =
    queue?.Type === STP_SQS_QUEUE_TYPE
      ? (properties?.sqsQueue as Record<string, unknown> | undefined)?.QueueName
      : queue?.Type === 'AWS::SQS::Queue'
        ? properties?.QueueName
        : undefined;
  return typeof name === 'string' ? name : undefined;
};

/**
 * The properties the service Lambda sets the queue policy from, or why it keeps `AWS::SQS::QueuePolicy`. Every queue
 * must be one of the stack's own, named by `Ref`.
 */
const getQueuePolicyProps = (
  template: CloudFormationTemplate,
  resource: TemplateResource,
  stackName: string
): Record<string, unknown> | string => {
  const properties = (resource.Properties ?? {}) as Record<string, unknown>;
  const unsupported = Object.keys(properties).filter((key) => !SUPPORTED_SQS_QUEUE_POLICY_PROPERTIES.has(key));
  if (unsupported.length) return `unsupported properties ${unsupported.join(', ')}`;
  const queues = properties.Queues;
  if (
    !Array.isArray(queues) ||
    !queues.length ||
    queues.some((queue) => !getReferencedQueueName(template, queue)?.startsWith(`${stackName}-`))
  ) {
    return "queues that are not the stack's own";
  }
  const policyDocument = toJsonText(properties.PolicyDocument, new Set(Object.keys(template.Resources)));
  if (policyDocument === undefined) return 'a policy document that cannot be sent as JSON text';
  return { PolicyDocument: policyDocument, Queues: queues };
};

const isQueueArnOf = (value: unknown, queueLogicalNames: Set<string>): string | undefined => {
  if (!isObject(value)) return undefined;
  const attribute = value['Fn::GetAtt'];
  const [logicalName, name] = Array.isArray(attribute)
    ? attribute
    : typeof attribute === 'string'
      ? attribute.split('.')
      : [];
  return name === 'Arn' && queueLogicalNames.has(logicalName as string) ? (logicalName as string) : undefined;
};

/**
 * IAM statements that name a queue the service Lambda creates use the queue's ARN, built from its name, instead of
 * `Fn::GetAtt`. The ARN is the same, but a role no longer waits for the queue: on a first deploy the function's role
 * and the queue are created at the same time. The function itself still waits for the queue when it references its
 * URL, and event source mappings still reference the queue.
 */
const nameQueuesByArnInPolicies = (template: CloudFormationTemplate, queueNames: Map<string, string>) => {
  const queueLogicalNames = new Set(queueNames.keys());
  const replaceInResource = (value: unknown): unknown => {
    const queueLogicalName = isQueueArnOf(value, queueLogicalNames);
    if (queueLogicalName) {
      return sub(`arn:\${AWS::Partition}:sqs:\${AWS::Region}:\${AWS::AccountId}:${queueNames.get(queueLogicalName)}`);
    }
    return Array.isArray(value) ? value.map(replaceInResource) : value;
  };
  const replaceInDocument = (document: unknown) => {
    if (!isObject(document) || !Array.isArray(document.Statement)) return;
    for (const statement of document.Statement) {
      if (isObject(statement) && 'Resource' in statement) statement.Resource = replaceInResource(statement.Resource);
    }
  };
  for (const resource of Object.values(template.Resources)) {
    const properties = resource.Properties as Record<string, unknown> | undefined;
    if (!properties) continue;
    if (resource.Type === 'AWS::IAM::Role' && Array.isArray(properties.Policies)) {
      for (const policy of properties.Policies) if (isObject(policy)) replaceInDocument(policy.PolicyDocument);
    }
    if (resource.Type === 'AWS::IAM::Policy' || resource.Type === 'AWS::IAM::ManagedPolicy') {
      replaceInDocument(properties.PolicyDocument);
    }
  }
};

/**
 * The service Lambda's permission for everything it creates in place of CloudFormation: the stack's own queues and
 * rules, by name prefix. A separate policy rather than a statement in the role: CloudFormation deletes the queues and
 * rules that depend on it before the policy itself. A role statement would be removed in the update phase, before the
 * cleanup deletes queues and rules that a later template (or a rollback to an earlier one) no longer has. The content is
 * the same whichever resources exist, for the same reason.
 */
const getServiceLambdaPolicy = ({ stackName, roleLogicalName }: { stackName: string; roleLogicalName: string }) =>
  ({
    Type: 'AWS::IAM::Policy',
    Properties: {
      PolicyName: SERVICE_LAMBDA_CREATED_RESOURCES_POLICY_NAME,
      Roles: [ref(roleLogicalName)],
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'sqs:CreateQueue',
              'sqs:GetQueueUrl',
              'sqs:GetQueueAttributes',
              'sqs:SetQueueAttributes',
              'sqs:ListQueueTags',
              'sqs:TagQueue',
              'sqs:UntagQueue',
              'sqs:DeleteQueue'
            ],
            Resource: [sub(`arn:\${AWS::Partition}:sqs:\${AWS::Region}:\${AWS::AccountId}:${stackName}-*`)]
          },
          {
            Effect: 'Allow',
            Action: [
              'events:PutRule',
              'events:DescribeRule',
              'events:DeleteRule',
              'events:PutTargets',
              'events:RemoveTargets',
              'events:ListTargetsByRule',
              'events:ListTagsForResource',
              'events:TagResource',
              'events:UntagResource'
            ],
            Resource: [
              sub(`arn:\${AWS::Partition}:events:\${AWS::Region}:\${AWS::AccountId}:rule/${stackName}-*`),
              sub(`arn:\${AWS::Partition}:events:\${AWS::Region}:\${AWS::AccountId}:rule/*/${stackName}-*`)
            ]
          }
        ]
      }
    }
  }) as unknown as TemplateResource;

/**
 * Creates SQS queues, queue policies and EventBridge rules that are new to the stack through the service Lambda instead
 * of CloudFormation. CloudFormation's `AWS::SQS::Queue` handler waits about 60 s after every create,
 * `AWS::SQS::QueuePolicy` about 30 s, and `AWS::Events::Rule` about 30 s after `PutRule` and 30 s after `PutTargets`.
 * Everything that references them (the queue of a dead-letter queue, a rule's queue target, a queue policy naming the
 * rule, the roles and functions using a queue) waited for that. The service Lambda returns as soon as SQS or
 * EventBridge has applied the change.
 *
 * The resource keeps its logical ID, `Ref` value and `Arn` (and for queues `QueueName` and `QueueUrl`) attributes. It
 * is converted after overrides and transforms, so they apply to the CloudFormation properties as before. Only resources
 * Stacktape synthesizes are converted, never user CloudFormation resources or CDK constructs.
 *
 * Deployed-form rule: a resource already deployed with its CloudFormation type keeps that form, as a type change would
 * replace it. One deployed in the new form keeps it. A queue that no longer qualifies stops the deploy; a rule or a
 * queue policy holds no data and goes back to its CloudFormation type.
 */
export const createNewQueuesAndRulesThroughServiceLambda = ({
  template,
  deployedTypes,
  deployedQueueNames,
  stacktapeLogicalNames,
  stackName,
  serviceLambdaLogicalName,
  serviceLambdaRoleLogicalName,
  tags
}: {
  template: CloudFormationTemplate;
  /** The type each logical ID is deployed with, from the deployed template and the stack's resources. */
  deployedTypes: Map<string, string>;
  /** The names of queues deployed in the new form, from the deployed template. */
  deployedQueueNames?: Map<string, string>;
  /** Logical IDs of resources Stacktape synthesizes (not user CloudFormation resources or CDK constructs). */
  stacktapeLogicalNames: Set<string>;
  stackName: string;
  serviceLambdaLogicalName: string;
  serviceLambdaRoleLogicalName: string;
  /** Stack tags. CloudFormation adds them to the resources it creates, so the service Lambda adds them to rules. */
  tags: { Key: string; Value: string }[];
}) => {
  const converted = { queues: [] as string[], queuePolicies: [] as string[], rules: [] as string[] };
  const serviceLambdaRole = template.Resources[serviceLambdaRoleLogicalName];
  if (!template.Resources[serviceLambdaLogicalName] || serviceLambdaRole?.Type !== 'AWS::IAM::Role') return converted;
  const policyLogicalName = cfLogicalNames.serviceLambdaCreatedResourcesPolicy();
  const queueNames = new Map<string, string>();
  const convert = (
    resource: TemplateResource,
    type: string,
    key: 'sqsQueue' | 'sqsQueuePolicy' | 'eventsRule',
    props: unknown
  ) => {
    resource.Type = type as TemplateResource['Type'];
    resource.Properties = { ServiceToken: getAtt(serviceLambdaLogicalName, 'Arn'), [key]: props };
    // Created after its permission, and deleted before it.
    resource.DependsOn = [
      ...new Set([...[resource.DependsOn ?? []].flat(), policyLogicalName])
    ] as TemplateResource['DependsOn'];
  };
  const resourceIds: ReadonlySet<string> = new Set(Object.keys(template.Resources));
  const candidates = Object.entries(template.Resources).filter(([cfLogicalName]) =>
    stacktapeLogicalNames.has(cfLogicalName)
  );
  for (const [cfLogicalName, resource] of candidates) {
    const deployedType = deployedTypes.get(cfLogicalName);
    if (resource.Type !== 'AWS::SQS::Queue' || deployedType === 'AWS::SQS::Queue') continue;
    const props = getQueueProps(resource, stackName);
    if (typeof props === 'string') {
      if (deployedType === STP_SQS_QUEUE_TYPE) {
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'SERVICE_LAMBDA_QUEUE_NO_LONGER_SUPPORTED',
          message: `SQS queue \`${cfLogicalName}\` was created by the Stacktape service Lambda, which cannot apply ${props}. Changing the queue's form would replace the queue and delete its messages.`,
          hints: 'Remove the override, or give the queue resource a new name to create a new queue.'
        });
      }
      continue;
    }
    const deployedName = deployedQueueNames?.get(cfLogicalName);
    if (deployedType === STP_SQS_QUEUE_TYPE && deployedName && deployedName !== props.QueueName) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'SERVICE_LAMBDA_QUEUE_REPLACEMENT',
        message: `SQS queue \`${cfLogicalName}\` would get a new name (\`${deployedName}\` → \`${props.QueueName as string}\`), for example because \`fifoEnabled\` changed. That replaces the queue and deletes its messages, so Stacktape does not do it in place.`,
        hints:
          'Add a new queue resource with the new setting, move producers and consumers to it, then remove the old queue.'
      });
    }
    queueNames.set(cfLogicalName, props.QueueName as string);
    converted.queues.push(cfLogicalName);
    convert(resource, STP_SQS_QUEUE_TYPE, 'sqsQueue', props);
  }
  for (const [cfLogicalName, resource] of candidates) {
    const deployedType = deployedTypes.get(cfLogicalName);
    // A rule or a queue policy that no longer qualifies goes back to its CloudFormation type: CloudFormation creates
    // that resource, then the service Lambda deletes its own. A rule gets a new name; the service Lambda's delete of a
    // queue policy would remove the policy CloudFormation has just set, so a converted policy has to stay converted.
    if (resource.Type === 'AWS::SQS::QueuePolicy' && deployedType !== 'AWS::SQS::QueuePolicy') {
      const props = getQueuePolicyProps(template, resource, stackName);
      if (typeof props === 'string') {
        if (deployedType === STP_SQS_QUEUE_POLICY_TYPE) {
          throw new CliError({
            category: 'CONFIG_VALIDATION',
            code: 'SERVICE_LAMBDA_QUEUE_POLICY_NO_LONGER_SUPPORTED',
            message: `SQS queue policy \`${cfLogicalName}\` was set by the Stacktape service Lambda, which cannot apply ${props}.`,
            hints: 'Remove the override or transform that changes this queue policy.'
          });
        }
        continue;
      }
      converted.queuePolicies.push(cfLogicalName);
      convert(resource, STP_SQS_QUEUE_POLICY_TYPE, 'sqsQueuePolicy', props);
    }
    if (resource.Type === 'AWS::Events::Rule' && deployedType !== 'AWS::Events::Rule') {
      const props = getRuleProps({ resource, stackName, cfLogicalName, tags, resourceIds });
      if (typeof props === 'string') continue;
      converted.rules.push(cfLogicalName);
      convert(resource, STP_EVENTS_RULE_TYPE, 'eventsRule', props);
    }
  }
  if (!converted.queues.length && !converted.queuePolicies.length && !converted.rules.length) return converted;
  nameQueuesByArnInPolicies(template, queueNames);
  template.Resources[policyLogicalName] = getServiceLambdaPolicy({
    stackName,
    roleLogicalName: serviceLambdaRoleLogicalName
  });
  return converted;
};

const serviceLambdaCustomResources = (template: CloudFormationTemplate, serviceLambdaLogicalName: string) =>
  Object.entries(template.Resources ?? {}).filter(([, resource]) => {
    const target = (
      (resource.Properties as Record<string, any> | undefined)?.ServiceToken as Record<string, unknown>
    )?.['Fn::GetAtt'];
    const logicalName = Array.isArray(target)
      ? target[0]
      : typeof target === 'string'
        ? target.split('.')[0]
        : undefined;
    return logicalName === serviceLambdaLogicalName;
  });

/**
 * Keeps the deployed service Lambda code in a rollback template when the deployed stack has service Lambda custom
 * resources the rollback removes. CloudFormation deletes them in the cleanup after the update, by which time the
 * rollback has switched the service Lambda to the release's code; a release made by an older CLI lacks the resolvers
 * that delete queues, rules or instance profiles it never created, and the delete would fail and leave them behind.
 * The service Lambda keeps every older resolver, so its newer code serves the rolled-back template as well.
 */
export const keepServiceLambdaCodeForRollback = ({
  rollbackTemplate,
  deployedTemplate,
  serviceLambdaLogicalName
}: {
  rollbackTemplate: CloudFormationTemplate;
  deployedTemplate: CloudFormationTemplate | undefined;
  serviceLambdaLogicalName: string;
}) => {
  const rollbackFunction = rollbackTemplate.Resources?.[serviceLambdaLogicalName];
  const deployedFunction = deployedTemplate?.Resources?.[serviceLambdaLogicalName];
  if (!deployedTemplate || !rollbackFunction?.Properties || !deployedFunction?.Properties) return false;
  const removed = serviceLambdaCustomResources(deployedTemplate, serviceLambdaLogicalName).some(
    ([logicalName, resource]) => rollbackTemplate.Resources[logicalName]?.Type !== resource.Type
  );
  if (!removed) return false;
  // The tags carry the code's identity (digests), so they move with the code.
  for (const property of ['Code', 'Tags']) {
    (rollbackFunction.Properties as Record<string, unknown>)[property] = structuredClone(
      (deployedFunction.Properties as Record<string, unknown>)[property]
    );
  }
  return true;
};
