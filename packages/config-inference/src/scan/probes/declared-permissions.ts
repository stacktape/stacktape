/**
 * The IAM permissions a SAM or Serverless function declares, as statements init can write into the configuration.
 *
 * `connectTo` grants broad access to a resource: every object operation on a bucket, every item operation on a table.
 * A function whose manifest grants less (a read-only policy, a statement scoped to one prefix, an explicit Deny) must
 * keep exactly what it declares. Each declared policy is therefore translated into statements naming the resources
 * init creates; a policy init cannot translate leaves the function out, because writing it with broader access, or
 * with none of the declared denials, would make it less safe than its source.
 */

import type { ServiceFactInput } from '../../facts/service';
import { referencedLogicalId } from './cloudformation-resources';
import { ABSENT, resolveDeclaredValue, selectBranch, type TemplateScope } from './declared-function';

type RecordValue = Record<string, unknown>;
type Statement = NonNullable<ServiceFactInput['functionIamStatements']>[number];
type Resource = Statement['resources'][number];

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Managed policies Stacktape's own function role already covers: logging, tracing and network interfaces. */
const COVERED_MANAGED_POLICIES = new Set([
  'AWSLambdaBasicExecutionRole',
  'AWSXRayDaemonWriteAccess',
  'AWSXrayWriteOnlyAccess',
  'AWSLambdaVPCAccessExecutionRole'
]);

const S3_READ = [
  's3:GetObject',
  's3:ListBucket',
  's3:GetBucketLocation',
  's3:GetObjectVersion',
  's3:GetLifecycleConfiguration'
];
const S3_WRITE = ['s3:PutObject', 's3:PutObjectAcl', 's3:PutLifecycleConfiguration'];
const DYNAMODB_READ = [
  'dynamodb:GetItem',
  'dynamodb:Scan',
  'dynamodb:Query',
  'dynamodb:BatchGetItem',
  'dynamodb:DescribeTable',
  'dynamodb:ConditionCheckItem'
];
const DYNAMODB_WRITE = ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:BatchWriteItem'];

/**
 * SAM policy templates, by name: the parameter naming the resource, the actions, and the parts of the resource they
 * apply to (`''` the resource itself, `/*` a bucket's objects, `/index/*` a table's indexes). From the SAM policy
 * template list; a template not listed here is not translated.
 */
const POLICY_TEMPLATES: Readonly<Record<string, { parameter: string; actions: string[]; suffixes: string[] }>> = {
  S3ReadPolicy: { parameter: 'BucketName', actions: S3_READ, suffixes: ['', '/*'] },
  S3WritePolicy: { parameter: 'BucketName', actions: S3_WRITE, suffixes: ['', '/*'] },
  S3CrudPolicy: {
    parameter: 'BucketName',
    actions: [...S3_READ, ...S3_WRITE, 's3:DeleteObject'],
    suffixes: ['', '/*']
  },
  DynamoDBReadPolicy: { parameter: 'TableName', actions: DYNAMODB_READ, suffixes: ['', '/index/*'] },
  DynamoDBWritePolicy: { parameter: 'TableName', actions: DYNAMODB_WRITE, suffixes: ['', '/index/*'] },
  DynamoDBCrudPolicy: {
    parameter: 'TableName',
    actions: [...DYNAMODB_READ, ...DYNAMODB_WRITE, 'dynamodb:DeleteItem'],
    suffixes: ['', '/index/*']
  },
  SQSSendMessagePolicy: { parameter: 'QueueName', actions: ['sqs:SendMessage*'], suffixes: [''] },
  SQSPollerPolicy: {
    parameter: 'QueueName',
    actions: [
      'sqs:ChangeMessageVisibility',
      'sqs:ChangeMessageVisibilityBatch',
      'sqs:DeleteMessage',
      'sqs:DeleteMessageBatch',
      'sqs:GetQueueAttributes',
      'sqs:ReceiveMessage'
    ],
    suffixes: ['']
  },
  SNSPublishMessagePolicy: { parameter: 'TopicName', actions: ['sns:Publish'], suffixes: [''] }
};

/**
 * What a function's declared permissions become. `statements` are the ones written as declared; `dropped` names Allow
 * policies init could not translate, which the function then lacks (less access, reported as a gap); `blocking` names
 * a Deny or a permissions boundary init could not translate, without which the function would get more access.
 */
export type DeclaredPermissions =
  | { kind: 'none' }
  | { kind: 'declared'; statements: Statement[]; dropped: string[]; blocking?: string };

export type PermissionContext = {
  scope: TemplateScope;
  /** Logical IDs of the resources init creates, mapped to their dependency names. */
  dependencyNames: ReadonlyMap<string, string>;
  /** Serverless variables that name one of those resources (`${self:provider.environment.TABLE}`). */
  variableDependencies?: ReadonlyMap<string, string>;
  /**
   * The physical names those resources declare (`TableName: !Ref TableNameParameter`), as JSON, mapped to their
   * dependency names: a policy template that names the table the same way means that table.
   */
  physicalNames?: ReadonlyMap<string, string>;
};

/** The properties that set a queue's, topic's, bucket's or table's physical name. */
export const PHYSICAL_NAME_PROPERTIES = ['TableName', 'BucketName', 'QueueName', 'TopicName'] as const;

/** A policy template parameter or statement resource as the dependency it names, a literal, or unreadable. */
const resourceOf = (value: unknown, context: PermissionContext, suffix = ''): Resource | undefined => {
  const selected = selectBranch(value, context.scope);
  if (selected === '*' && suffix === '') return '*';
  const logicalId = referencedLogicalId(selected, new Set(context.dependencyNames.keys()));
  if (logicalId !== undefined) {
    // `Fn::Sub: arn:aws:s3:::${Bucket}/*` keeps what follows the reference.
    const sub = isRecord(selected) ? selected['Fn::Sub'] : undefined;
    const template = typeof sub === 'string' ? sub : undefined;
    const after =
      template === undefined ? '' : (template.split(new RegExp(`\\$\\{${logicalId}(?:\\.Arn)?\\}`))[1] ?? '');
    const before =
      template === undefined ? '' : (template.replace(/\$\{AWS::Partition\}/g, 'aws').split('${')[0] ?? '');
    if (template !== undefined && !/^(?:arn:aws:s3:::)?$/.test(before)) return undefined;
    const tail = `${after}${suffix}`;
    if (tail !== '' && !/^[A-Za-z0-9/*_.:-]+$/.test(tail)) return undefined;
    return { dependencyName: context.dependencyNames.get(logicalId)!, ...(tail === '' ? {} : { suffix: tail }) };
  }
  // `Fn::Join: ['', ['arn:aws:s3:::', !Ref Bucket, '/*']]`: a literal prefix, one resource and a literal suffix.
  const join = isRecord(selected) ? selected['Fn::Join'] : undefined;
  if (Array.isArray(join) && join[0] === '' && Array.isArray(join[1])) {
    const parts = join[1] as unknown[];
    const index = parts.findIndex(
      (part) => referencedLogicalId(part, new Set(context.dependencyNames.keys())) !== undefined
    );
    const literals = parts.filter((_, position) => position !== index);
    if (index !== -1 && literals.every((part) => typeof part === 'string' && !part.includes('${'))) {
      const before = (parts.slice(0, index) as string[]).join('').replace(PSEUDO_PARAMETERS, '');
      const after = (parts.slice(index + 1) as string[]).join('');
      const joinedId = referencedLogicalId(parts[index], new Set(context.dependencyNames.keys()))!;
      const tail = `${after}${suffix}`;
      if (/^(?:arn:aws:s3:::)?$/.test(before) && (tail === '' || /^[A-Za-z0-9/*_.:-]+$/.test(tail))) {
        return { dependencyName: context.dependencyNames.get(joinedId)!, ...(tail === '' ? {} : { suffix: tail }) };
      }
    }
    return undefined;
  }
  if (typeof selected === 'string' && context.variableDependencies !== undefined) {
    // A Serverless ARN built from a variable that names one of the resources init creates. Its region and account
    // are this stack's own, whatever variable states them.
    const match = /^(arn:aws:(?:dynamodb|sqs|sns|s3):[^$]*?)\$\{([^}]+)\}(.*)$/.exec(
      selected.replace(PSEUDO_PARAMETERS, '*')
    );
    const dependencyName = match === null ? undefined : context.variableDependencies.get(match[2]!);
    if (match !== null && dependencyName !== undefined && !match[3]!.includes('${')) {
      const prefix = match[1]!;
      const known =
        /^arn:aws:s3:::$|^arn:aws:(?:dynamodb):[^:]*:[^:]*:table\/$|^arn:aws:(?:sqs|sns):[^:]*:[^:]*:$/.test(prefix);
      const tail = `${match[3]}${suffix}`;
      if (known && (tail === '' || /^[A-Za-z0-9/*_.:-]+$/.test(tail))) {
        return { dependencyName, ...(tail === '' ? {} : { suffix: tail }) };
      }
    }
  }
  const named = context.physicalNames?.get(JSON.stringify(selected));
  if (named !== undefined && (suffix === '' || /^[A-Za-z0-9/*_.:-]+$/.test(suffix))) {
    return { dependencyName: named, ...(suffix === '' ? {} : { suffix }) };
  }
  const literal = resolveDeclaredValue(selected, context.scope);
  if (typeof literal !== 'string' || literal.includes('${')) return undefined;
  if (literal === '*' && suffix === '') return '*';
  const arn = `${literal}${suffix}`;
  return /^arn:aws[a-z-]*:[A-Za-z0-9:/*_.+=,@-]+$/.test(arn) ? arn : undefined;
};

/** Variables that state the stack's own region or account inside an ARN. */
const PSEUDO_PARAMETERS =
  /\$\{(?:aws:region|aws:accountId|self:provider\.region|opt:region[^}]*|AWS::Region|AWS::AccountId)\}/g;

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined ? [] : [value]);

/** One IAM statement, or undefined when part of it cannot be written as declared. */
const statementOf = (declared: unknown, context: PermissionContext): Statement | undefined => {
  const statement = selectBranch(declared, context.scope);
  if (!isRecord(statement)) return undefined;
  // A condition narrows the statement in a way the configuration cannot express; NotAction/NotResource invert it.
  if (Object.keys(statement).some((key) => !['Effect', 'Action', 'Resource', 'Sid'].includes(key))) return undefined;
  const effect = resolveDeclaredValue(statement.Effect, context.scope);
  if (effect !== 'Allow' && effect !== 'Deny') return undefined;
  const actions = resolveDeclaredValue(listOf(statement.Action), context.scope);
  if (
    !Array.isArray(actions) ||
    actions.length === 0 ||
    !actions.every((action) => typeof action === 'string' && /^(?:\*|[a-zA-Z0-9-]+:[A-Za-z0-9*]+)$/.test(action))
  ) {
    return undefined;
  }
  const resources = listOf(statement.Resource).map((resource) => resourceOf(resource, context));
  if (resources.length === 0 || resources.some((resource) => resource === undefined)) return undefined;
  return { effect, actions: actions as string[], resources: resources as Resource[] };
};

/** The effect a statement declares, when init can read it. */
const effectOf = (declared: unknown, context: PermissionContext): unknown => {
  const statement = selectBranch(declared, context.scope);
  return isRecord(statement) ? resolveDeclaredValue(statement.Effect, context.scope) : undefined;
};

/** A Serverless statement list, or an inline policy document's `Statement` in SAM `Policies`. */
export const declaredStatements = (
  statements: unknown,
  context: PermissionContext,
  key: string
): { statements: Statement[]; dropped: string[]; blocking?: string } => {
  const result: Statement[] = [];
  const dropped: string[] = [];
  for (const [index, declared] of listOf(statements).entries()) {
    if (selectBranch(declared, context.scope) === ABSENT) continue;
    const statement = statementOf(declared, context);
    if (statement !== undefined) result.push(statement);
    else if (effectOf(declared, context) === 'Allow') dropped.push(`${key}.${index}`);
    else return { statements: result, dropped, blocking: `${key}.${index}` };
  }
  return { statements: result, dropped };
};

/**
 * SAM `Policies`: managed policy names, policy templates and inline policy documents, alone or in a list. Managed
 * policies and policy templates only allow, so one init cannot translate is dropped. A function with its own `Role`
 * gets none of that role's permissions.
 */
export const samPermissions = (policies: unknown, role: unknown, context: PermissionContext): DeclaredPermissions => {
  if (role !== undefined) return { kind: 'declared', statements: [], dropped: ['Role'] };
  if (policies === undefined) return { kind: 'none' };
  const statements: Statement[] = [];
  const dropped: string[] = [];
  for (const [index, entry] of listOf(policies).entries()) {
    const policy = selectBranch(entry, context.scope);
    if (policy === ABSENT) continue;
    const key = `Policies.${index}`;
    if (typeof policy === 'string') {
      if (!COVERED_MANAGED_POLICIES.has(policy.replace(/^arn:aws:iam::aws:policy\/(?:service-role\/)?/, ''))) {
        dropped.push(key);
      }
      continue;
    }
    // An inline document, in SAM's shorthand or as a named policy (`PolicyName` and `PolicyDocument`).
    const document = isRecord(policy) && isRecord(policy.PolicyDocument) ? policy.PolicyDocument : policy;
    if (isRecord(document) && document.Statement !== undefined) {
      const inline = declaredStatements(document.Statement, context, `${key}.Statement`);
      statements.push(...inline.statements);
      dropped.push(...inline.dropped);
      if (inline.blocking !== undefined) return { kind: 'declared', statements, dropped, blocking: inline.blocking };
      continue;
    }
    const [name, parameters] = isRecord(policy) && Object.keys(policy).length === 1 ? Object.entries(policy)[0]! : [];
    const template = typeof name === 'string' ? POLICY_TEMPLATES[name] : undefined;
    const target = template === undefined || !isRecord(parameters) ? undefined : parameters[template.parameter];
    const resources =
      template === undefined ? [] : template.suffixes.map((suffix) => resourceOf(target, context, suffix));
    if (template === undefined || resources.some((resource) => resource === undefined || resource === '*')) {
      // Every SAM policy template allows; none denies.
      if (isRecord(policy)) dropped.push(key);
      else return { kind: 'declared', statements, dropped, blocking: key };
      continue;
    }
    statements.push({ effect: 'Allow', actions: template.actions, resources: resources as Resource[] });
  }
  return { kind: 'declared', statements, dropped };
};
