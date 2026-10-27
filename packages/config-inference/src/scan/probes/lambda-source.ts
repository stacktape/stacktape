/** Handler-shaped source files in projects that do not carry a SAM descriptor. */

import { posix } from 'node:path';
import type { Citation } from '../../facts/citation';
import { defaultDependencyName, type DependencyFact } from '../../facts/dependency';
import { UNROUTED_HTTP_SOURCE, type FunctionTrigger, type ServiceFactInput } from '../../facts/service';
import type { Uncertainty } from '../../facts/uncertainty';
import {
  citeFirstMatch,
  citeFirstMatchOnly,
  readText,
  type Probe,
  type ProbeContext,
  type ProbeOutput
} from '../probe';

/**
 * Only exports that are actually handler-shaped.
 *
 * The directory name alone is not enough: `src/handlers/userHandler.js` containing
 * `module.exports = router` is a perfectly ordinary Express layout, and an earlier version of this
 * pattern matched any bare `module.exports =` — turning route files into phantom Lambda functions
 * beside the real web service. A function claim needs a `handler` export by name.
 */
const HANDLER_PATTERN =
  /(?:export\s+(?:const\s+handler|async\s+function\s+handler|function\s+handler)|def\s+(?:lambda_handler|handler)\s*\(|(?:module\.)?exports\.handler\s*=)/;

/** Entry files a single-function project keeps at its top level. */
const ENTRY_FILE = /^(?:src\/)?(?:index|handler|lambda|main|app)\.(?:[cm]?js|tsx?|py)$/;
/** Lambda-specific imports and types: the file was written to run as a function. */
const LAMBDA_SIGNAL =
  /aws-lambda|serverless-http|serverless-express|APIGatewayProxy|LambdaFunctionURL|lambda_handler|\bawslambda\b/;

/**
 * Event types from `@types/aws-lambda`, by the trigger each one implies.
 *
 * A handler typed with one of these was written for exactly that event source, so the type is the
 * repository's own statement of how the function is invoked. Only the types a handler parameter or a
 * `Handler` annotation names count; an import alone proves nothing about this file's export.
 */
type EventFamily =
  | { trigger: 'http'; payloadFormat: '1.0' | '2.0' }
  | { trigger: 'queue' | 'topic' | 'object-storage' | 'schedule' | 'websocket' | 'dynamodb-stream' | 'event-bus' }
  | { trigger: 'unmapped'; sourceType: string };

const EVENT_TYPES: ReadonlyArray<{ names: readonly string[]; family: EventFamily }> = [
  {
    names: [
      'APIGatewayProxyEventV2',
      'APIGatewayProxyEventV2WithJWTAuthorizer',
      'APIGatewayProxyEventV2WithLambdaAuthorizer',
      'APIGatewayProxyHandlerV2',
      'APIGatewayProxyHandlerV2WithJWTAuthorizer',
      'APIGatewayProxyHandlerV2WithLambdaAuthorizer',
      // A function URL receives the same event as an HTTP API with payload format 2.0.
      'LambdaFunctionURLEvent',
      'LambdaFunctionURLHandler'
    ],
    family: { trigger: 'http', payloadFormat: '2.0' }
  },
  {
    names: [
      'APIGatewayProxyEvent',
      'APIGatewayEvent',
      'APIGatewayProxyHandler',
      'APIGatewayProxyWithCognitoAuthorizerEvent',
      'APIGatewayProxyWithCognitoAuthorizerHandler'
    ],
    family: { trigger: 'http', payloadFormat: '1.0' }
  },
  {
    names: [
      'APIGatewayProxyWebsocketEventV2',
      'APIGatewayProxyWebsocketEventV2WithRequestContext',
      'APIGatewayProxyWebsocketHandlerV2'
    ],
    family: { trigger: 'websocket' }
  },
  { names: ['SQSEvent', 'SQSHandler'], family: { trigger: 'queue' } },
  { names: ['SNSEvent', 'SNSHandler'], family: { trigger: 'topic' } },
  { names: ['S3Event', 'S3Handler', 'S3CreateEvent'], family: { trigger: 'object-storage' } },
  { names: ['ScheduledEvent', 'ScheduledHandler'], family: { trigger: 'schedule' } },
  { names: ['DynamoDBStreamEvent', 'DynamoDBStreamHandler'], family: { trigger: 'dynamodb-stream' } },
  {
    names: ['KinesisStreamEvent', 'KinesisStreamHandler'],
    family: { trigger: 'unmapped', sourceType: 'a Kinesis stream' }
  },
  {
    names: ['ALBEvent', 'ALBHandler'],
    family: { trigger: 'unmapped', sourceType: 'an Application Load Balancer' }
  },
  // An event bus rule when some code in the repository publishes the detail type the handler is written for.
  { names: ['EventBridgeEvent', 'EventBridgeHandler'], family: { trigger: 'event-bus' } }
];

/** What an EventBridge handler is invoked by when nothing in the repository publishes its events. */
const EVENTBRIDGE_RULE_SOURCE = 'an EventBridge rule';

const EVENT_TYPE_NAMES = EVENT_TYPES.flatMap((entry) => entry.names).toSorted((a, b) => b.length - a.length);
/** `SQSHandler`, `APIGatewayProxyHandlerV2WithJWTAuthorizer`: the type of a handler, not of the event it receives. */
const isHandlerType = (name: string) => /Handler(?:V2)?(?:With\w+)?$/.test(name);
const ANY_TYPE = `(${EVENT_TYPE_NAMES.join('|')})\\b`;
const EVENT_TYPE = `(${EVENT_TYPE_NAMES.filter((name) => !isHandlerType(name)).join('|')})\\b`;

/**
 * The type a handler export is declared with: the first parameter's annotation, or a `Handler` type on the export.
 *
 * `export default async (event: SQSEvent) =>`, `export async function handler(event: APIGatewayProxyEventV2)`,
 * `export const handler: SQSHandler = ...` and `export const handler: Handler<ScheduledEvent> = ...` all qualify. A
 * parameter typed with a handler type (`export default (handler: APIGatewayProxyHandlerV2) => ...`) is a wrapper that
 * builds a handler, not one.
 */
const TYPED_EXPORT_PATTERNS: readonly RegExp[] = [
  new RegExp(`export\\s+default\\s+(?:async\\s+)?(?:function\\s*[\\w$]*\\s*)?\\(\\s*[^)]*?:\\s*${EVENT_TYPE}`),
  new RegExp(
    `export\\s+(?:const\\s+handler\\s*=\\s*(?:async\\s+)?(?:function\\s*[\\w$]*\\s*)?|(?:async\\s+)?function\\s+handler\\s*)\\(\\s*[^)]*?:\\s*${EVENT_TYPE}`
  ),
  new RegExp(`export\\s+const\\s+handler\\s*:\\s*(?:Handler\\s*<\\s*)?${ANY_TYPE}`)
];

const TYPED_EXPORT = /export\s+(?:default\b|const\s+handler\b|(?:async\s+)?function\s+handler\b)/;

/** `EventBridgeEvent<'Scheduled Event', ...>` is the schedule shape under its generic name. */
const SCHEDULED_EVENTBRIDGE = /EventBridge(?:Event|Handler)\s*<\s*['"`]Scheduled Event['"`]/;
/** A literal schedule expression next to the handler, the only rate the source itself can state. */
const SCHEDULE_LITERAL = /['"`]((?:rate|cron)\([^'"`)]+\))['"`]/;

/** Source files that are part of the application rather than its tests, tooling or build output. */
const NON_APPLICATION_PATH =
  /(?:^|\/)(?:node_modules|dist|build|out|lib|\.next|\.output|\.stacktape|\.sst|cdk\.out|\.aws-sam|coverage|tests?|__tests__|__mocks__|spec|e2e|cypress|fixtures|examples?|scripts|docs?)(?:\/|$)/i;
const NON_APPLICATION_FILE =
  /\.(?:test|spec|stories)\.[^.]+$|\.d\.ts$|(?:^|\/)[^/]*\.config\.[cm]?[jt]s$|(?:^|\/)(?:test_[^/]*|[^/]*_test|conftest)\.py$/i;
const MAX_TYPED_CANDIDATES = 400;
const HANDLER_DIRECTORY = /(?:^|\/)(?:functions?|lambdas?|handlers?)(?:\/|$)/i;

type TypedHandler = { family: EventFamily; citation: Citation | undefined };

const typedHandler = (path: string, raw: string): TypedHandler | undefined => {
  if (!/['"]aws-lambda['"]/.test(raw)) return undefined;
  for (const pattern of TYPED_EXPORT_PATTERNS) {
    const typeName = pattern.exec(raw)?.[1];
    if (typeName === undefined) continue;
    const entry = EVENT_TYPES.find((candidate) => candidate.names.includes(typeName))!;
    const family: EventFamily =
      entry.family.trigger === 'event-bus' && SCHEDULED_EVENTBRIDGE.test(raw) ? { trigger: 'schedule' } : entry.family;
    return {
      family,
      citation: citeFirstMatchOnly(path, raw, new RegExp(`\\b${typeName}\\b`), 'functionTriggers')
    };
  }
  return undefined;
};

/**
 * A handler export without an event type, with its first two parameters: `export const handler = async (event, context)
 * =>`, `export default async function (event)` or `exports.handler = async event =>` (groups 1 and 2), and
 * `export async function handler(event)` (groups 3 and 4). Python's `def handler(event, context):` has the function
 * name in group 1 and the parameters in groups 2 and 3.
 */
const UNTYPED_JS_EXPORT =
  /(?:export\s+(?:const\s+handler\s*=\s*|default\s+)|(?:module\.)?exports\.handler\s*=\s*)(?:async\s+)?(?:function\s*[\w$]*\s*)?\(?\s*([\w$]*)\s*(?::[^,)]*)?(?:,\s*([\w$]+))?|export\s+(?:async\s+)?function\s+handler\s*\(\s*([\w$]*)\s*(?::[^,)]*)?(?:,\s*([\w$]+))?/;
const PYTHON_HANDLER = /^def\s+(lambda_handler|handler)\s*\(\s*(\w*)\s*(?::[^,)]*)?(?:,\s*(\w+))?/m;
const EVENT_PARAMETER = /^_?(?:event|evt)$/;
const CONTEXT_PARAMETER = /^_?(?:context|ctx)$/;

type UntypedExport = { eventParameter: boolean; contextParameter: boolean; pythonHandler?: string };

const untypedExport = (path: string, raw: string): UntypedExport | undefined => {
  if (path.endsWith('.py')) {
    const match = PYTHON_HANDLER.exec(raw);
    if (match === null) return undefined;
    return {
      eventParameter: EVENT_PARAMETER.test(match[2] ?? ''),
      contextParameter: CONTEXT_PARAMETER.test(match[3] ?? ''),
      pythonHandler: match[1]!
    };
  }
  const match = UNTYPED_JS_EXPORT.exec(raw);
  if (match === null) return undefined;
  const first = match[1] ?? match[3] ?? '';
  const second = match[2] ?? match[4] ?? '';
  return { eventParameter: EVENT_PARAMETER.test(first), contextParameter: CONTEXT_PARAMETER.test(second) };
};

/** A field read in JavaScript (`.http`, `?.http`, `['http']`) or Python (`['http']`, `.get('http'`). */
const field = (name: string) => `(?:\\??\\.${name}\\b|\\[\\s*['"]${name}['"]\\s*\\]|\\.get\\(\\s*['"]${name}['"])`;

const firstMatching =
  (patterns: readonly RegExp[]) =>
  (raw: string): RegExp | undefined =>
    patterns.find((pattern) => pattern.test(raw));

/** Code that creates schedules (EventBridge rules, EventBridge Scheduler) holds rates that are not its own. */
const CREATES_SCHEDULES =
  /\bScheduleExpression\b|\b(?:PutRule|CreateSchedule)Command\b|\b(?:put_rule|create_schedule)\(/;

/** Names a handler gives the records it iterates: `for (const record of event.Records)`, `event.Records.map((r) =>`, `for record in event['Records']`. */
const RECORD_ITERATIONS: readonly RegExp[] = [
  new RegExp(`for\\s*\\(\\s*(?:const|let|var)\\s+([\\w$]+)\\s+of\\s+[\\w$.?]*${field('Records')}`, 'g'),
  new RegExp(
    `${field('Records')}\\s*\\??\\.\\s*(?:map|forEach|filter|flatMap|some|every|find)\\(\\s*(?:async\\s*)?\\(?\\s*([\\w$]+)`,
    'g'
  ),
  new RegExp(`for\\s+(\\w+)\\s+in\\s+[\\w.]*${field('Records')}`, 'g')
];

/** A field read on a record the handler iterates (`record.dynamodb`), or on an indexed record (`Records[0].dynamodb`). */
const recordField = (raw: string, name: string): RegExp | undefined => {
  const records = new Set(RECORD_ITERATIONS.flatMap((pattern) => [...raw.matchAll(pattern)].map((match) => match[1]!)));
  const candidates = [
    ...[...records].map((record) => new RegExp(`(?<![\\w$.])${record.replace(/\$/g, '\\$')}${field(name)}`)),
    new RegExp(`${field('Records')}\\s*\\[\\s*\\d+\\s*\\]${field(name)}`)
  ];
  return candidates.find((candidate) => candidate.test(raw));
};

/**
 * The body of an SQS record: `.body` on a record the handler iterates, destructured from it, or on an indexed record.
 * A `.body` elsewhere (an HTTP response, a fetch result) says nothing about the event.
 */
const sqsRecordBody = (raw: string): RegExp | undefined => {
  const destructured = new RegExp(
    `for\\s*\\(\\s*(?:const|let|var)\\s*\\{[^}]*\\bbody\\b[^}]*\\}\\s+of\\s+[\\w$.?]*${field('Records')}`
  );
  return recordField(raw, 'body') ?? (destructured.test(raw) ? destructured : undefined);
};

/**
 * The event an untyped handler is written for, read off the fields it touches. Every Python handler is untyped, and so
 * is a lot of JavaScript; without this they deploy with no trigger at all.
 *
 * Each shape is specific to one event source. Where a file reads several, the envelope that invokes the function wins.
 * A WebSocket route comes first because only its events carry a `connectionId`. SNS comes before SQS because an SQS
 * record never carries `Sns`. SQS comes before DynamoDB and S3 because an SQS handler that parses a forwarded record
 * or an S3 notification out of `record.body` is still invoked by the queue.
 */
const EVENT_SHAPES: ReadonlyArray<{ family: EventFamily; match: (raw: string) => RegExp | undefined }> = [
  {
    family: { trigger: 'websocket' },
    match: (raw) =>
      /requestContext/.test(raw) && new RegExp(field('connectionId')).test(raw)
        ? firstMatching([new RegExp(field('routeKey')), new RegExp(field('eventType'))])(raw)
        : undefined
  },
  {
    family: { trigger: 'http', payloadFormat: '2.0' },
    match: firstMatching([
      new RegExp(`requestContext['"\\]]*[^\\n;]{0,16}?${field('http')}`),
      new RegExp(field('rawPath'))
    ])
  },
  {
    family: { trigger: 'http', payloadFormat: '1.0' },
    match: firstMatching([
      new RegExp(field('httpMethod')),
      new RegExp(`requestContext['"\\]]*[^\\n;]{0,16}?${field('resourcePath')}`)
    ])
  },
  { family: { trigger: 'topic' }, match: firstMatching([new RegExp(field('Sns')), /['"]aws:sns['"]/]) },
  {
    family: { trigger: 'queue' },
    match: (raw) =>
      sqsRecordBody(raw) ??
      firstMatching([/['"]aws:sqs['"]/, new RegExp(field('receiptHandle')), /\bbatchItemFailures\b/])(raw)
  },
  {
    family: { trigger: 'dynamodb-stream' },
    match: (raw) => recordField(raw, 'dynamodb') ?? firstMatching([/['"]aws:dynamodb['"]/])(raw)
  },
  {
    family: { trigger: 'object-storage' },
    match: firstMatching([new RegExp(`${field('s3')}${field('(?:bucket|object)')}`), /['"]aws:s3['"]/])
  },
  // A schedule rule's event, or a literal rate beside the handler (`export const schedule = 'rate(2 minutes)'`).
  {
    family: { trigger: 'schedule' },
    match: (raw) =>
      firstMatching([
        /['"]Scheduled Event['"]/,
        /['"]aws\.events['"]/,
        ...(CREATES_SCHEDULES.test(raw) ? [] : [SCHEDULE_LITERAL])
      ])(raw)
  },
  // An EventBridge event from a rule on a bus: its `detail-type`, when it is not a schedule's.
  { family: { trigger: 'event-bus' }, match: firstMatching([/['"]detail-type['"]/]) }
];

const LIFECYCLE_ROUTES = ['$connect', '$disconnect'];
const ROUTE_KEY_READ = `(?:\\broute_?[kK]ey\\b|\\[\\s*['"]routeKey['"]\\s*\\])`;
const QUOTED = `['"\`]([^'"\`]+)['"\`]`;

/**
 * The WebSocket routes a handler serves: the route keys it compares `requestContext.routeKey` against, `$connect`,
 * `$disconnect` and `$default` wherever it names them, and `$default` for the branch that handles every other message.
 * A handler that names no route takes every message on `$default`.
 */
const websocketRouteKeys = (raw: string): string[] => {
  const keys = new Set<string>();
  const comparisons = [...raw.matchAll(new RegExp(`${ROUTE_KEY_READ}\\s*(?:===?|!==?)\\s*${QUOTED}`, 'g'))];
  for (const match of comparisons) keys.add(match[1]!);
  for (const match of raw.matchAll(new RegExp(`${ROUTE_KEY_READ}\\s+in\\s+[([{]([^)\\]}]*)`, 'g'))) {
    for (const literal of match[1]!.matchAll(new RegExp(QUOTED, 'g'))) keys.add(literal[1]!);
  }
  const switched = new RegExp(`(?:switch\\s*\\(|\\bmatch\\s+)[^)\\n:]*${ROUTE_KEY_READ}`).test(raw);
  if (switched) {
    for (const match of raw.matchAll(new RegExp(`\\bcase\\s+${QUOTED}\\s*:`, 'g'))) keys.add(match[1]!);
  }
  for (const match of raw.matchAll(/['"`]?(\$(?:connect|disconnect|default))\b/g)) keys.add(match[1]!);
  const fallback =
    (comparisons.length > 0 && (/\belse\b(?!\s*if\b)/.test(raw) || /^\s*else\s*:/m.test(raw))) ||
    (switched && /\bdefault\s*:|\bcase\s+_\s*:/.test(raw));
  if (fallback || keys.size === 0) keys.add('$default');
  const rank = (key: string) =>
    LIFECYCLE_ROUTES.includes(key) ? LIFECYCLE_ROUTES.indexOf(key) : key === '$default' ? 3 : 2;
  return [...keys].toSorted((left, right) => rank(left) - rank(right));
};

/** The item images a stream handler reads, which its table's stream has to carry. Reading neither keeps both. */
const streamTypeFor = (raw: string): 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES' => {
  const reads = { next: /\bNewImage\b/.test(raw), previous: /\bOldImage\b/.test(raw) };
  if (reads.next && !reads.previous) return 'NEW_IMAGE';
  if (reads.previous && !reads.next) return 'OLD_IMAGE';
  return 'NEW_AND_OLD_IMAGES';
};

const literalsIn = (text: string): string[] => [...text.matchAll(new RegExp(QUOTED, 'g'))].map((match) => match[1]!);

/**
 * The `detail-type` values an EventBridge handler is written for: the type argument of `EventBridgeEvent<'X', ...>`,
 * or the values the code compares `event['detail-type']` with.
 */
const handledDetailTypes = (raw: string): string[] => {
  const typed = /EventBridge(?:Event|Handler)\s*<\s*((?:['"`][^'"`]+['"`]\s*\|?\s*)+)/.exec(raw)?.[1];
  const compared = [
    ...raw.matchAll(
      new RegExp(
        `(?:\\[\\s*['"]detail-type['"]\\s*\\]|\\.get\\(\\s*['"]detail-type['"]\\s*\\)|\\bdetail_?[tT]ype\\b)\\s*(?:===?|==)\\s*${QUOTED}`,
        'g'
      )
    )
  ].map((match) => match[1]!);
  return [...new Set([...(typed === undefined ? [] : literalsIn(typed)), ...compared])].filter(
    (detailType) => detailType !== 'Scheduled Event'
  );
};

const PUBLISHES_EVENTS = /\bPutEventsCommand\b|\.putEvents\s*\(|\bput_events\s*\(/;
const ENVIRONMENT_READ =
  /process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\])|os\.(?:environ\[\s*|environ\.get\(\s*|getenv\(\s*)['"]([A-Z][A-Z0-9_]*)['"]/;

/** Code that publishes events, with the detail types and sources it publishes and the variables naming its bus. */
type Publisher = {
  path: string;
  detailTypes: string[];
  sources: string[];
  busVariables: string[];
  evidence: Citation | undefined;
};

/**
 * What a file publishes with `PutEvents`. Only a bus the code reads from its environment counts: a literal bus name is
 * not the bus Stacktape creates, and an entry without one goes to the account's default bus.
 */
const publisherIn = (path: string, raw: string): Publisher | undefined => {
  if (!PUBLISHES_EVENTS.test(raw)) return undefined;
  const detailTypes = [...raw.matchAll(new RegExp(`['"]?DetailType['"]?\\s*[:=]\\s*${QUOTED}`, 'g'))].map(
    (match) => match[1]!
  );
  if (detailTypes.length === 0) return undefined;
  const sources = [...raw.matchAll(new RegExp(`['"]?\\bSource['"]?\\s*[:=]\\s*${QUOTED}`, 'g'))].map(
    (match) => match[1]!
  );
  const busVariables = new Set<string>();
  for (const match of raw.matchAll(/['"]?EventBusName['"]?\s*[:=]\s*([^,}\n]+)/g)) {
    const value = match[1]!.trim();
    const direct = ENVIRONMENT_READ.exec(value);
    // `EventBusName: busName`, with `const busName = process.env.EVENT_BUS_NAME` earlier in the file.
    const assigned = /^[\w$]+$/.test(value)
      ? ENVIRONMENT_READ.exec(new RegExp(`\\b${value.replace(/\$/g, '\\$')}\\s*=\\s*([^;\\n]+)`).exec(raw)?.[1] ?? '')
      : null;
    const read = direct ?? assigned;
    const name = read?.[1] ?? read?.[2] ?? read?.[3];
    if (name !== undefined) busVariables.add(name);
  }
  if (busVariables.size === 0) return undefined;
  return {
    path,
    detailTypes: [...new Set(detailTypes)],
    sources: [...new Set(sources)],
    busVariables: [...busVariables],
    evidence: citeFirstMatchOnly(path, raw, PUBLISHES_EVENTS, 'dependencies')
  };
};

const inferEventFamily = (raw: string): { family: EventFamily; pattern: RegExp } | undefined => {
  for (const { family, match } of EVENT_SHAPES) {
    const pattern = match(raw);
    if (pattern !== undefined) return { family, pattern };
  }
  return undefined;
};

/** The line that showed the event shape. */
const citeInferred = (path: string, raw: string, pattern: RegExp | undefined): Citation | undefined =>
  pattern === undefined ? undefined : citeFirstMatchOnly(path, raw, pattern, 'functionTriggers');

const languageFor = (path: string): string =>
  path.endsWith('.py') ? 'python' : path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript';

/** File names that say nothing about the function: `api/main.py` is the `api` function. */
const GENERIC_STEMS = new Set(['handler', 'index', 'main', 'app', 'lambda', 'lambda_function']);

const nameFor = (path: string): string => {
  const segments = path.split('/');
  const stem = posix.basename(path).replace(/\.[^.]+$/, '');
  if (!GENERIC_STEMS.has(stem.toLowerCase())) return stem;
  for (let index = segments.length - 2; index >= 0; index -= 1) {
    const segment = segments[index]!;
    if (!['src', 'handlers', 'handler', 'functions', 'function', 'lambdas', 'lambda'].includes(segment.toLowerCase())) {
      return segment;
    }
  }
  return ['handler', 'index'].includes(stem.toLowerCase()) ? 'handler' : stem;
};

const GENERIC_DIRECTORIES = new Set([
  'src',
  'handlers',
  'handler',
  'functions',
  'function',
  'lambdas',
  'lambda',
  'apps',
  'packages',
  'services'
]);

/**
 * Names that stay unique when two handlers have the same file name: `apps/users/src/api.ts` and
 * `apps/orders/src/api.ts` become `users-api` and `orders-api`, not two services called `api`.
 */
const uniqueHandlerNames = (paths: readonly string[]): Map<string, string> => {
  const names = new Map(paths.map((path) => [path, nameFor(path)]));
  const counts = new Map<string, number>();
  for (const name of names.values()) counts.set(name, (counts.get(name) ?? 0) + 1);
  for (const [path, name] of names) {
    if ((counts.get(name) ?? 0) < 2) continue;
    const directory = path
      .split('/')
      .slice(0, -1)
      .toReversed()
      .find((segment) => !GENERIC_DIRECTORIES.has(segment.toLowerCase()) && segment !== name);
    if (directory !== undefined) names.set(path, `${directory}-${name}`);
  }
  return names;
};

export const lambdaSourceProbe: Probe = {
  name: 'lambda-source',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    // SAM is more authoritative: it distinguishes multiple exports in one file and names events.
    for (const path of ['template.yaml', 'template.yml', 'sam-template.yaml', 'sam-template.yml']) {
      if (!context.files.includes(path)) continue;
      // oxlint-disable-next-line no-await-in-loop -- stop after the first authoritative SAM template.
      const raw = await readText(context, path);
      if (raw !== undefined && /AWS::Serverless-2016-10-31/.test(raw)) return {};
    }
    // Same deference to the Serverless Framework: its manifest names the functions and their
    // events, so pattern-matching the same handler files again would only mint duplicates.
    if (context.files.some((path) => /(^|\/)serverless\.ya?ml$/.test(path))) return {};
    // And to SST, whose config declares its functions by handler path.
    if (context.files.includes('sst.config.ts') || context.files.includes('sst.config.js')) return {};
    // And to CDK, whose stacks name their entry files and event sources.
    if (context.files.includes('cdk.json')) return {};
    // And to Terraform, whose `aws_lambda_function` resources name their handlers.
    if (context.files.some((path) => /(?:^|\/)[^/]+\.tf$/.test(path))) return {};

    const services: ServiceFactInput[] = [];
    const dependencies: DependencyFact[] = [];
    const uncertainties: Uncertainty[] = [];
    const handlers: Array<{
      path: string;
      raw: string;
      family: EventFamily | undefined;
      triggerEvidence: Citation | undefined;
      entryEvidence: Citation | undefined;
      pythonHandler: string | undefined;
    }> = [];
    const claimed = new Set<string>();
    const publishers = new Map<string, Publisher>();
    const notePublisher = (path: string, raw: string) => {
      const publisher = publisherIn(path, raw);
      if (publisher !== undefined) publishers.set(path, publisher);
    };

    // Files under a handlers directory, and top-level entry files that name Lambda, are functions by their `handler`
    // export alone.
    const conventional = context.files.filter(
      (path) => /\.(?:[cm]?js|tsx?|py)$/.test(path) && (HANDLER_DIRECTORY.test(path) || ENTRY_FILE.test(path))
    );
    for (const path of conventional) {
      // oxlint-disable-next-line no-await-in-loop -- each candidate is small and reads are policy controlled.
      const raw = await readText(context, path, { fullFile: true });
      if (raw !== undefined) notePublisher(path, raw);
      if (raw === undefined || !HANDLER_PATTERN.test(raw)) continue;
      // An entry file outside a handlers directory counts only when it names Lambda itself: a Hono or Express app
      // wrapped for Lambda exports `handler` from `src/index.ts`, and so does plenty of code that is not a function.
      if (!HANDLER_DIRECTORY.test(path) && !LAMBDA_SIGNAL.test(raw)) continue;
      claimed.add(path);
      const typed = typedHandler(path, raw);
      const inferred = typed === undefined ? inferEventFamily(raw) : undefined;
      handlers.push({
        path,
        raw,
        family: typed?.family ?? inferred?.family,
        triggerEvidence: typed?.citation ?? citeInferred(path, raw, inferred?.pattern),
        entryEvidence: citeFirstMatch(path, raw, HANDLER_PATTERN, 'functionEntrypoint'),
        pythonHandler: untypedExport(path, raw)?.pythonHandler
      });
    }

    // Elsewhere a handler has to say what it is. A handler typed with an AWS Lambda event can live anywhere:
    // `src/api.ts` exporting `default async (event: APIGatewayProxyEventV2)` is a function however its directory is
    // named, and its type says which event invokes it. An untyped one (every Python handler) qualifies when it takes
    // `(event, context)` or reads the fields of one event source, and those fields say which.
    const application = context.files.filter(
      (path) => !claimed.has(path) && !NON_APPLICATION_PATH.test(path) && !NON_APPLICATION_FILE.test(path)
    );
    // Bounded per language, so a Python-heavy repository does not crowd out its TypeScript handlers or the reverse.
    const bounded = new Set([
      ...application.filter((path) => /\.(?:[cm]?[jt]s|tsx)$/.test(path)).slice(0, MAX_TYPED_CANDIDATES),
      ...application.filter((path) => path.endsWith('.py')).slice(0, MAX_TYPED_CANDIDATES)
    ]);
    const elsewhere = application.filter((path) => bounded.has(path));
    for (const path of elsewhere) {
      // oxlint-disable-next-line no-await-in-loop -- bounded, policy-controlled reads in a stable order.
      const raw = await readText(context, path, { fullFile: true });
      if (raw === undefined) continue;
      notePublisher(path, raw);
      const typed = typedHandler(path, raw);
      if (typed !== undefined) {
        handlers.push({
          path,
          raw,
          family: typed.family,
          triggerEvidence: typed.citation,
          entryEvidence: citeFirstMatch(path, raw, TYPED_EXPORT, 'functionEntrypoint'),
          pythonHandler: undefined
        });
        continue;
      }
      const exported = untypedExport(path, raw);
      if (exported === undefined || !exported.eventParameter) continue;
      const inferred = inferEventFamily(raw);
      // `(event, context)` is the Lambda signature itself; a schedule literal alone proves nothing about the export.
      if (!exported.contextParameter && (inferred === undefined || inferred.pattern === SCHEDULE_LITERAL)) continue;
      handlers.push({
        path,
        raw,
        family: inferred?.family,
        triggerEvidence: citeInferred(path, raw, inferred?.pattern),
        entryEvidence: citeFirstMatch(
          path,
          raw,
          path.endsWith('.py') ? PYTHON_HANDLER : UNTYPED_JS_EXPORT,
          'functionEntrypoint'
        ),
        pythonHandler: exported.pythonHandler
      });
    }

    // Every HTTP handler would otherwise get the catch-all route on the one HTTP API, and CloudFormation rejects two
    // `* /{proxy+}` routes. Only a lone HTTP handler is the API; several have to be given their routes.
    const httpHandlerCount = handlers.filter(({ family }) => family?.trigger === 'http').length;

    // The resource a trigger names is the one other probes find under the same default name, so they fold together.
    const ensureDependency = (
      kind: 'queue' | 'topic' | 'object-storage' | 'dynamodb' | 'websocket-api' | 'event-bus',
      evidence: Citation[],
      addressedBy: readonly string[] = []
    ): string => {
      const name = defaultDependencyName(kind);
      const existing = dependencies.find((dependency) => dependency.name === name);
      if (existing === undefined) {
        dependencies.push({
          name,
          kind,
          extensions: [],
          consumedBy: [],
          addressedBy: [...addressedBy],
          evidence,
          source: 'probe'
        });
      } else {
        existing.addressedBy = [...new Set([...existing.addressedBy, ...addressedBy])];
        existing.evidence = [...existing.evidence, ...evidence].slice(0, 3);
      }
      return name;
    };

    for (const { path, raw, family, triggerEvidence, entryEvidence, pythonHandler } of handlers) {
      const evidence = triggerEvidence === undefined ? [] : [triggerEvidence];
      const triggers: FunctionTrigger[] = [];
      if (family?.trigger === 'http') {
        triggers.push(
          httpHandlerCount === 1
            ? // The handler routes on its own (`event.rawPath`), so every method and path reaches it.
              { type: 'http', method: '*', path: '/{proxy+}', payloadFormat: family.payloadFormat }
            : { type: 'unmapped', sourceType: UNROUTED_HTTP_SOURCE }
        );
      } else if (family?.trigger === 'schedule') {
        const rate = SCHEDULE_LITERAL.exec(raw)?.[1];
        if (rate === undefined) {
          uncertainties.push({
            kind: 'schedule-unknown',
            // Keyed by file until the names are final below.
            id: `schedule-unknown:${path}`,
            blocksDeploy: false,
            evidence,
            source: 'probe',
            serviceName: nameFor(path),
            suggestions: []
          });
        } else {
          triggers.push({ type: 'schedule', rate });
        }
      } else if (family?.trigger === 'unmapped') {
        triggers.push({ type: 'unmapped', sourceType: family.sourceType });
      } else if (family?.trigger === 'websocket') {
        // All WebSocket handlers share one API, the way HTTP handlers share one HTTP API.
        triggers.push({
          type: 'websocket',
          dependencyName: ensureDependency('websocket-api', evidence),
          routeKeys: websocketRouteKeys(raw)
        });
      } else if (family?.trigger === 'dynamodb-stream') {
        // Which table the code does not say; with one table in the project it is that one.
        triggers.push({
          type: 'dynamodb-stream',
          dependencyName: ensureDependency('dynamodb', evidence),
          streamType: streamTypeFor(raw)
        });
      } else if (family?.trigger === 'event-bus') {
        // A rule matches events someone publishes. Without code that publishes this detail type to a bus it names, the
        // events come from elsewhere (AWS services, another project), and a rule guessed here would never fire.
        const detailTypes = handledDetailTypes(raw);
        const senders = [...publishers.values()].filter(
          (publisher) =>
            publisher.path !== path && publisher.detailTypes.some((detailType) => detailTypes.includes(detailType))
        );
        if (senders.length === 0) {
          triggers.push({ type: 'unmapped', sourceType: EVENTBRIDGE_RULE_SOURCE });
        } else {
          const sources = [...new Set(senders.flatMap((sender) => sender.sources))];
          triggers.push({
            type: 'event-bus',
            dependencyName: ensureDependency(
              'event-bus',
              senders.flatMap((sender) => (sender.evidence === undefined ? [] : [sender.evidence])).slice(0, 3),
              senders.flatMap((sender) => sender.busVariables)
            ),
            detailTypes: detailTypes.filter((detailType) =>
              senders.some((sender) => sender.detailTypes.includes(detailType))
            ),
            ...(sources.length === 0 ? {} : { sources })
          });
        }
      } else if (family !== undefined) {
        // Which queue, topic or bucket the code does not say; the default name is the one every other probe uses
        // for the same kind, so it folds into theirs, and Stacktape-named reads later rename it.
        const kind = family.trigger === 'queue' ? 'queue' : family.trigger === 'topic' ? 'topic' : 'object-storage';
        triggers.push({ type: family.trigger, dependencyName: ensureDependency(kind, evidence) });
      }

      services.push({
        name: nameFor(path),
        path: posix.dirname(path) === '.' ? '.' : posix.dirname(path),
        processType: path,
        language: languageFor(path),
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: path,
        // Stacktape calls a Python module's `handler`; AWS's own examples name it `lambda_handler`.
        ...(pythonHandler === 'lambda_handler' && !/^def\s+handler\s*\(/m.test(raw)
          ? { functionHandler: pythonHandler }
          : {}),
        functionTriggers: triggers,
        environmentVariables: [],
        evidence: [...(entryEvidence === undefined ? [] : [entryEvidence]), ...evidence],
        source: 'probe'
      });
    }

    const finalNames = uniqueHandlerNames(services.map((service) => service.functionEntrypoint!));
    for (const service of services) {
      const name = finalNames.get(service.functionEntrypoint!)!;
      for (const uncertainty of uncertainties) {
        if (
          uncertainty.kind === 'schedule-unknown' &&
          uncertainty.id === `schedule-unknown:${service.functionEntrypoint}`
        ) {
          uncertainty.serviceName = name;
          uncertainty.id = `schedule-unknown:${name}`;
        }
      }
      service.name = name;
    }

    return services.length === 0
      ? {}
      : {
          services,
          ...(dependencies.length === 0 ? {} : { dependencies }),
          ...(uncertainties.length === 0 ? {} : { uncertainties })
        };
  }
};
