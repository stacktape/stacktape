/** Handler-shaped source files in projects that do not carry a SAM descriptor. */

import { posix } from 'node:path';
import type { Citation } from '../../facts/citation';
import { defaultDependencyName, type DependencyFact } from '../../facts/dependency';
import {
  DIRECT_INVOCATION_SOURCE,
  UNROUTED_HTTP_SOURCE,
  type FunctionTrigger,
  type ServiceFactInput
} from '../../facts/service';
import type { HandlerFinding } from '../../facts/project-facts';
import type { Uncertainty } from '../../facts/uncertainty';
import {
  citeFirstMatch,
  citeFirstMatchOnly,
  citeLine,
  readText,
  type Probe,
  type ProbeContext,
  type ProbeOutput
} from '../probe';
import { sliceBalancedBraces } from '../balanced-slice';
import { citeFirstCodeMatch, maskFile, maskSource } from '../lexical';
import { outsidePackageNamespace } from '../service-root';
import { JWT_CLAIMS_READ } from './cognito';
import { objectShape, orderWorkflowSteps, stepShapeOf } from './step-functions';

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

/**
 * An async default export in a functions directory: `export default async (input: ScoreInput) =>`. A step a state
 * machine invokes takes the input it is given rather than an AWS event type, so nothing in the file says Lambda. Such a
 * file becomes a function only when a workflow the code starts runs it (see `orderWorkflowSteps`).
 */
const ASYNC_DEFAULT_EXPORT = /export\s+default\s+async\s+(?:function\s*[\w$]*\s*)?\(/;
/**
 * Default exports that run on another platform or in a browser: Netlify functions (`netlify/functions`, `(req,
 * context)`), Appwrite functions (`({ req, res, log })`), and frontend modules (React, Vue, Svelte, `'use client'`).
 */
const OTHER_PLATFORM_PATH = /(?:^|\/)(?:netlify|appwrite)\//i;
const OTHER_PLATFORM_SOURCE =
  /@netlify\/functions|node-appwrite|['"](?:react|react-dom|vue|svelte|solid-js|@angular\/core|next\/[\w/-]+)['"]|['"]use (?:client|server)['"]|export\s+default\s+async\s+(?:function\s*[\w$]*\s*)?\(\s*(?:\{[^}]*\b(?:req|res)\b|(?:req|request)\b)/;

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
  | {
      trigger:
        | 'queue'
        | 'topic'
        | 'object-storage'
        | 'schedule'
        | 'websocket'
        | 'dynamodb-stream'
        | 'event-bus'
        | 'url';
    }
  | { trigger: 'unmapped'; sourceType: string };

const EVENT_TYPES: ReadonlyArray<{ names: readonly string[]; family: EventFamily }> = [
  {
    names: [
      'APIGatewayProxyEventV2',
      'APIGatewayProxyEventV2WithJWTAuthorizer',
      'APIGatewayProxyEventV2WithLambdaAuthorizer',
      'APIGatewayProxyHandlerV2',
      'APIGatewayProxyHandlerV2WithJWTAuthorizer',
      'APIGatewayProxyHandlerV2WithLambdaAuthorizer'
    ],
    family: { trigger: 'http', payloadFormat: '2.0' }
  },
  // The event is an HTTP API 2.0 event, but the handler was written for its own URL, which serves every path.
  { names: ['LambdaFunctionURLEvent', 'LambdaFunctionURLHandler'], family: { trigger: 'url' } },
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
/**
 * A Python module docstring that states the handler's schedule on a line of its own: `Schedule: rate(1 minute)`, or
 * the bare expression. Prose that mentions one (`ran on rate(1 hour) before the move`) states nothing.
 */
const DOCSTRING_SCHEDULE =
  /(?<![\s\S])(?:\s*#[^\n]*\n)*\s*[rRuU]?("""|''')(?:(?!\1)[\s\S])*?(?:^|(?<=["']{3}))[ \t]*(?:[Ss]chedule[ \t]*:[ \t]*)?((?:rate|cron)\([^)\n]+\))[ \t]*\.?[ \t]*(?:$|(?=\1))/m;
/** The schedule the source states next to its handler: a quoted literal, or a Python module docstring. */
const scheduleIn = (raw: string): string | undefined =>
  SCHEDULE_LITERAL.exec(raw)?.[1] ?? DOCSTRING_SCHEDULE.exec(raw)?.[2];

/** Source files that are part of the application rather than its tests, tooling or build output. */
const NON_APPLICATION_PATH =
  /(?:^|\/)(?:node_modules|dist|build|out|lib|\.next|\.output|\.stacktape|\.sst|cdk\.out|\.aws-sam|coverage|tests?|__tests__|__mocks__|spec|e2e|cypress|fixtures|examples?|scripts|docs?)(?:\/|$)/i;
const NON_APPLICATION_FILE =
  /\.(?:test|spec|stories)\.[^.]+$|\.d\.ts$|(?:^|\/)[^/]*\.config\.[cm]?[jt]s$|(?:^|\/)(?:test_[^/]*|[^/]*_test|conftest)\.py$/i;
const MAX_TYPED_CANDIDATES = 400;
const HANDLER_DIRECTORY = /(?:^|\/)(?:functions?|lambdas?|handlers?)(?:\/|$)/i;

type TypedHandler = { family: EventFamily; citation: Citation | undefined };

/** `code` is `raw` with comments and string contents blanked: an export in a comment or a string is no handler. */
const typedHandler = (path: string, raw: string, code: string): TypedHandler | undefined => {
  if (!/['"]aws-lambda['"]/.test(raw)) return undefined;
  for (const pattern of TYPED_EXPORT_PATTERNS) {
    const typeName = pattern.exec(code)?.[1];
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

/** `const { routeKey, connectionId } = event.requestContext`. */
const requestContextDestructuring = (name: string) =>
  new RegExp(`\\{[^}]*\\b${name}\\b[^}]*\\}\\s*=\\s*[\\w$.?]*requestContext\\b`);

/** A `requestContext` field the handler reads, through a property or by destructuring. */
const readsRequestContext = (raw: string, name: string): boolean =>
  /requestContext/.test(raw) && (new RegExp(field(name)).test(raw) || requestContextDestructuring(name).test(raw));

/** Fields of every other event source's envelope: SQS, SNS, S3, DynamoDB and Kinesis records, EventBridge, WebSocket. */
const EVENT_SOURCE_SHAPE =
  /\bRecords\b|\bSns\b|\breceiptHandle\b|\bdetail-type\b|\bconnectionId\b|\brouteKey\b|\bbatchItemFailures\b|['"]aws:(?:sqs|sns|s3|dynamodb|kinesis)['"]/;
/** A returned proxy response: `{ statusCode: 200 }`, Python's `{'statusCode': 200}`. */
const PROXY_RESPONSE = /['"]?\bstatusCode['"]?\s*:/;

/** Fields only an HTTP API (payload 2.0) event has. */
const HTTP_V2_EVENT: readonly RegExp[] = [
  new RegExp(`requestContext['"\\]]*[^\\n;]{0,16}?${field('http')}`),
  new RegExp(field('rawPath'))
];

/** Handler types for a route behind a JWT or Cognito authorizer: the handler relies on its claims. */
const JWT_HANDLER_TYPE =
  /\bAPIGatewayProxy(?:EventV2|HandlerV2)WithJWTAuthorizer\b|\bAPIGatewayProxyWithCognitoAuthorizer(?:Event|Handler)\b/;

/**
 * The route has to sit behind an authorizer: the handler's code reads its JWT claims, or is typed for them. A comment
 * that mentions the claims is no read.
 */
const readsJwtClaims = (path: string, raw: string): boolean => {
  const code = maskFile(path, raw, 'keep');
  return JWT_HANDLER_TYPE.test(code) || JWT_CLAIMS_READ.test(code);
};

/** An untyped handler that reads JWT authorizer claims handles HTTP API (payload 2.0) requests. */
const inferWithClaims = (path: string, raw: string): { family: EventFamily; pattern: RegExp } | undefined =>
  inferEventFamily(raw) ??
  (readsJwtClaims(path, raw)
    ? { family: { trigger: 'http', payloadFormat: '2.0' }, pattern: JWT_CLAIMS_READ }
    : undefined);
/** A WebSocket lifecycle route, or the event type a WebSocket event carries. */
const WEBSOCKET_ROUTE = /['"`]\$(?:connect|disconnect|default)['"`]/;
const WEBSOCKET_EVENT_TYPE = /\beventType\b[^\n]{0,12}['"`](?:CONNECT|DISCONNECT|MESSAGE)['"`]/;

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
    match: (raw) => {
      // An HTTP API event has a `routeKey` too (`'POST /broadcast'`), and a handler can post to WebSocket connections
      // without being a WebSocket route itself.
      if (HTTP_V2_EVENT.some((pattern) => pattern.test(raw))) return undefined;
      if (!readsRequestContext(raw, 'connectionId')) return undefined;
      if (!WEBSOCKET_ROUTE.test(raw) && !WEBSOCKET_EVENT_TYPE.test(raw)) return undefined;
      return firstMatching([
        new RegExp(field('routeKey')),
        new RegExp(field('eventType')),
        requestContextDestructuring('routeKey'),
        requestContextDestructuring('eventType')
      ])(raw);
    }
  },
  // Powertools' function URL event and resolver (`LambdaFunctionUrlEvent`, `LambdaFunctionUrlResolver`): the handler
  // serves its own URL. Its event has the HTTP API 2.0 fields too, so this comes first.
  { family: { trigger: 'url' }, match: firstMatching([/\bLambdaFunctionUrl(?:Event|Resolver)\b/]) },
  { family: { trigger: 'http', payloadFormat: '2.0' }, match: firstMatching(HTTP_V2_EVENT) },
  {
    family: { trigger: 'http', payloadFormat: '1.0' },
    match: firstMatching([
      new RegExp(field('httpMethod')),
      new RegExp(`requestContext['"\\]]*[^\\n;]{0,16}?${field('resourcePath')}`)
    ])
  },
  // An API Gateway handler that reads only the request's path or query parameters and answers with a status code:
  // `event.pathParameters.id` in, `{ statusCode: 200, body }` out. Either alone is weak, since any object can carry a
  // `statusCode`; together they are the proxy integration's request and response. A file that names any event source's
  // shape anywhere, even in a string or a test sample, may be that source's handler forwarding a request, so it is left
  // to the shapes below.
  {
    family: { trigger: 'http', payloadFormat: '1.0' },
    match: (raw) =>
      PROXY_RESPONSE.test(raw) && !EVENT_SOURCE_SHAPE.test(raw)
        ? firstMatching([new RegExp(field('pathParameters')), new RegExp(field('queryStringParameters'))])(raw)
        : undefined
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
        ...(CREATES_SCHEDULES.test(raw) ? [] : [SCHEDULE_LITERAL, DOCSTRING_SCHEDULE])
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
  // `eventType === 'CONNECT'` routes by the event type instead: messages arrive on `$default`.
  for (const match of raw.matchAll(/\beventType\b[^\n]{0,12}['"`](CONNECT|DISCONNECT|MESSAGE)['"`]/g)) {
    keys.add(({ CONNECT: '$connect', DISCONNECT: '$disconnect', MESSAGE: '$default' } as const)[match[1] as 'CONNECT']);
  }
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

/** One `PutEvents` entry: its detail type, its `Source` when the code writes it as a literal, and the variable naming its bus. */
type PublishedEntry = { detailType: string; source: string | undefined; busVariable: string };

/** Code that publishes events, entry by entry. */
type Publisher = { path: string; entries: PublishedEntry[]; evidence: Citation | undefined };

/** The innermost object literal around `index`: the `PutEvents` entry a `DetailType` belongs to. */
const enclosingObject = (raw: string, index: number): string | undefined => {
  for (let open = raw.lastIndexOf('{', index); open !== -1; open = raw.lastIndexOf('{', open - 1)) {
    const slice = sliceBalancedBraces(raw, open);
    if (slice !== undefined && slice.end > index) return slice.body;
    if (index - open > 2000) return undefined;
  }
  return undefined;
};

/** The variable a value reads: `process.env.X`, `os.environ['X']`, or a name assigned from one earlier in the file. */
const environmentVariableIn = (value: string, raw: string): string | undefined => {
  const direct = ENVIRONMENT_READ.exec(value);
  // `EventBusName: busName`, with `const busName = process.env.EVENT_BUS_NAME` earlier in the file.
  const assigned = /^[\w$]+$/.test(value)
    ? ENVIRONMENT_READ.exec(new RegExp(`\\b${value.replace(/\$/g, '\\$')}\\s*=\\s*([^;\\n]+)`).exec(raw)?.[1] ?? '')
    : null;
  const read = direct ?? assigned;
  return read?.[1] ?? read?.[2] ?? read?.[3];
};

const DETAIL_TYPE = new RegExp(`['"]?\\bDetailType['"]?\\s*[:=]\\s*${QUOTED}`, 'g');
const FIELD_VALUE = (name: string) => new RegExp(`['"]?\\b${name}['"]?\\s*[:=]\\s*([^,}\\n]+)`);

/**
 * The entries a file publishes with `PutEvents`. Only a bus the entry reads from the environment counts: a literal bus
 * name is not the bus Stacktape creates, and an entry without one goes to the account's default bus. A `Source` read
 * from a variable is unknown, not the literal of some other call in the file.
 */
const publisherIn = (path: string, raw: string): Publisher | undefined => {
  if (!PUBLISHES_EVENTS.test(raw)) return undefined;
  const entries: PublishedEntry[] = [];
  for (const match of raw.matchAll(DETAIL_TYPE)) {
    const entry = enclosingObject(raw, match.index ?? 0);
    if (entry === undefined) continue;
    const bus = FIELD_VALUE('EventBusName').exec(entry)?.[1]?.trim();
    const busVariable = bus === undefined ? undefined : environmentVariableIn(bus, raw);
    if (busVariable === undefined) continue;
    const source = FIELD_VALUE('Source').exec(entry)?.[1]?.trim();
    const literal = source === undefined ? undefined : new RegExp(`^${QUOTED}$`).exec(source)?.[1];
    entries.push({ detailType: match[1]!, source: literal, busVariable });
  }
  return entries.length === 0
    ? undefined
    : { path, entries, evidence: citeFirstMatchOnly(path, raw, PUBLISHES_EVENTS, 'functionTriggers') };
};

const START_EXECUTION =
  /\b(?:StartExecutionCommand|StartSyncExecutionCommand)\b|\.start(?:Sync)?Execution\s*\(|\bstart_(?:sync_)?execution\s*\(/;

/** A call that starts an execution of the state machine whose ARN `variable` holds. */
type WorkflowStart = {
  variable: string;
  /** The top-level keys of the execution input, when the code writes it as an object literal. */
  inputKeys: string[] | undefined;
  evidence: Citation | undefined;
};

/** The object literal that starts at the first `{` after `from`, if it is the next thing there. */
const objectAt = (raw: string, from: number): string | undefined => {
  const open = raw.indexOf('{', from);
  if (open === -1 || raw.slice(from, open).trim() !== '') return undefined;
  return sliceBalancedBraces(raw, open)?.body;
};

/**
 * The executions a file starts: `new StartExecutionCommand({ stateMachineArn: process.env.X, input: JSON.stringify({...}) })`
 * or `client.start_execution(stateMachineArn=os.environ["X"], input=json.dumps({...}))`. Only an ARN read from a
 * variable counts: a literal ARN is a state machine somebody else created.
 */
const workflowStartsIn = (path: string, raw: string): WorkflowStart[] => {
  if (!START_EXECUTION.test(raw)) return [];
  const starts: WorkflowStart[] = [];
  for (const match of raw.matchAll(new RegExp(START_EXECUTION.source, 'g'))) {
    // The call's arguments: an ordinary keyword or object argument list fits in the next 1,200 characters.
    const after = raw.slice(match.index, match.index + 1200);
    const arn = /\bstateMachineArn\s*[:=]\s*([^,)}\n]+)/.exec(after)?.[1]?.trim();
    const variable = arn === undefined ? undefined : environmentVariableIn(arn, raw);
    if (variable === undefined || starts.some((start) => start.variable === variable)) continue;
    const input = /\binput\s*[:=]\s*(?:JSON\.stringify|json\.dumps)\(\s*/.exec(after);
    const body = input === null ? undefined : objectAt(after, input.index + input[0].length);
    const shape = body === undefined ? undefined : objectShape(body);
    starts.push({
      variable,
      inputKeys: shape === undefined || shape.spreads.length > 0 ? undefined : shape.keys,
      evidence: citeFirstMatchOnly(path, raw, new RegExp(`\\bstateMachineArn\\b[^\\n]*${variable}`), 'dependencies')
    });
  }
  return starts;
};

/**
 * A Lambda `Invoke` call: `new InvokeCommand({ FunctionName })`, `lambda.invoke({ FunctionName })`, boto3's
 * `client.invoke(FunctionName=...)`. A bare `.invoke(` is not one (LangChain chains, RPC clients).
 */
const DIRECT_INVOKE =
  /\bInvoke(?:Async|WithResponseStream)?Command\s*\(|\.invoke(?:_async|Async)?\s*\(\s*\{?\s*FunctionName\b/g;

/** What an `Invoke` call names: the variable holding the function's name or ARN, or a literal; undefined if neither. */
type DirectInvoke = { path: string; target: string | undefined };

const directInvokesIn = (path: string, raw: string): DirectInvoke[] =>
  [...raw.matchAll(DIRECT_INVOKE)].map((match) => {
    const value = /\bFunctionName\s*[:=]\s*([^,)}\n]+)/.exec(raw.slice(match.index, match.index + 600))?.[1]?.trim();
    const literal = value === undefined ? undefined : new RegExp(`^${QUOTED}$`).exec(value)?.[1];
    return { path, target: value === undefined ? undefined : (environmentVariableIn(value, raw) ?? literal) };
  });

const nameWords = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * The function an `Invoke` call reaches: `SEND_EMAIL_FUNCTION_NAME` and `SEND_EMAIL_ARN` name `send-email` or
 * `sendEmail`, and a literal `shop-dev-sendEmail` ends with it. Only a single match counts.
 */
const invokeTargetName = (target: string | undefined, names: readonly string[]): string | undefined => {
  if (target === undefined) return undefined;
  const variable = /^[A-Z][A-Z0-9_]*$/.test(target)
    ? nameWords(target.replace(/(?:_(?:NAME|ARN))+$/, '').replace(/_(?:FUNCTION|LAMBDA|FN)$/, ''))
    : undefined;
  const matches = names.filter((name) =>
    variable === undefined ? nameWords(target).endsWith(nameWords(name)) : variable === nameWords(name)
  );
  return matches.length === 1 ? matches[0] : undefined;
};

/** The detail types code publishes, for the loop check on a handler that also publishes. */
export const publishedDetailTypes = (raw: string): string[] =>
  PUBLISHES_EVENTS.test(raw) ? [...raw.matchAll(DETAIL_TYPE)].map((match) => match[1]!) : [];

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

const HTTP_METHODS = 'GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS';

/**
 * The path parameters an HTTP handler reads: `event.pathParameters.sku`, `pathParameters?.['sku']`,
 * `const { sku } = event.pathParameters`, Python's `event['pathParameters']['sku']` and `.get('sku')`, and Java's
 * `getPathParameters().get("sku")`.
 */
const pathParametersIn = (raw: string): string[] => {
  const names = new Set<string>();
  const patterns = [
    /\bpathParameters\s*\??\.\s*(?!get\b)([A-Za-z_$][\w$]*)/g,
    /\bpathParameters['"]?\s*\]?\s*\??\.?\s*\[\s*['"]([\w-]+)['"]\s*\]/g,
    /(?:\bpathParameters['"]?\s*(?:,\s*(?:\{\s*\}|None)\s*)?[\])]?|getPathParameters\(\s*\)|PathParameters)\s*\??\.\s*get\(\s*['"]([\w-]+)['"]/g,
    /PathParameters\s*\[\s*"([\w-]+)"\s*\]/g
  ];
  for (const pattern of patterns) for (const match of raw.matchAll(pattern)) names.add(match[1]!);
  for (const match of raw.matchAll(/\{([^{}]*)\}\s*=\s*[\w$.?]*\bpathParameters\b/g)) {
    for (const entry of match[1]!.split(',')) {
      const key = /^\s*([A-Za-z_$][\w$]*)/.exec(entry)?.[1];
      if (key !== undefined) names.add(key);
    }
  }
  return [...names];
};

/**
 * What a guard that turns other requests away looks like after its comparison: the end of the condition, then `return`,
 * `throw` or `raise` (`if (method !== 'GET') return { statusCode: 405 }`, `if event['httpMethod'] != 'GET':\n  return`).
 */
const TURNS_AWAY = String.raw`[^\n]*?(?:\)\s*\{?|:)\s*(?:return|throw|raise)\b`;

/**
 * The one HTTP method a handler serves, when it turns every other method away. A method it only tests for
 * (`if (method === 'OPTIONS') return cors()`, `if (method === 'POST') save(); else load();`) is one branch of several,
 * so it pins nothing.
 */
const guardedMethod = (raw: string): string | undefined => {
  const guard = new RegExp(
    String.raw`(?:\b(?:httpMethod|method|HttpMethod)\b['"\]]*\s*!==?\s*['"](${HTTP_METHODS})['"]|!\s*[\w.]*getHttpMethod\(\)\s*\.equals(?:IgnoreCase)?\(\s*"(${HTTP_METHODS})"\s*\))${TURNS_AWAY}`,
    'gi'
  );
  const methods = new Set([...raw.matchAll(guard)].map((match) => (match[1] ?? match[2])!.toUpperCase()));
  return methods.size === 1 ? [...methods][0] : undefined;
};

/** The route key a handler turns every other request away from: `if (event.routeKey !== 'POST /broadcast') return`. */
const guardedRouteKey = (raw: string): { method: string; path: string } | undefined => {
  const guard = new RegExp(
    String.raw`\brouteKey\b['"\]]*\s*!==?\s*['"\x60](${HTTP_METHODS}|ANY)\s+(\/[^'"\x60\s]*)['"\x60]${TURNS_AWAY}`,
    'g'
  );
  const routes = new Map([...raw.matchAll(guard)].map((match) => [`${match[1]} ${match[2]}`, match] as const));
  if (routes.size !== 1) return undefined;
  const [match] = [...routes.values()];
  return { method: match![1] === 'ANY' ? '*' : match![1]!, path: match![2]! };
};

/** Paths stated in the source, in a comment or a string: `// GET /quote/{sku}?quantity=12`. */
const statedPaths = (raw: string): string[] => [
  ...new Set(
    [...raw.matchAll(new RegExp(String.raw`\b(?:${HTTP_METHODS}|ANY)\s+(\/[\w\-./{}+]*)`, 'g'))].map((match) =>
      match[1]!.replace(/(?<=.)\/$/, '')
    )
  )
];

/** A handler comparing or switching on the request path: it serves several routes itself. */
const ROUTES_ITSELF =
  /\b(?:rawPath|path|resource|routeKey)\b['"\]]*\s*(?:===?|!==?)|\b(?:rawPath|path)\b['"\]]*\s*\.\s*(?:startsWith|endsWith|match|includes|split)\s*\(|switch\s*\([^)]*\b(?:rawPath|path|routeKey)\b/;

/**
 * The route an HTTP handler serves, only where its code or its own comment leaves no doubt: the one route key it turns
 * every other request away from, or the one stated path that holds every path parameter it reads (`// GET
 * /quote/{sku}` above a handler reading `pathParameters.sku`). The method is pinned only when the handler turns every
 * other method away. A handler that routes on its own (it compares the request path or reads `proxy`) has no single
 * route, and a file name says too little: `getUser.ts` serves `GET /users/{id}`, not `/get-user/{id}`.
 */
const handlerRoute = (raw: string): { method: string; path: string } | undefined => {
  const routeKey = guardedRouteKey(raw);
  if (routeKey !== undefined) return routeKey;
  const parameters = pathParametersIn(raw);
  if (parameters.length === 0 || parameters.includes('proxy') || ROUTES_ITSELF.test(raw)) return undefined;
  const stated = statedPaths(raw).filter((path) => parameters.every((parameter) => path.includes(`{${parameter}}`)));
  return stated.length === 1 ? { method: guardedMethod(raw) ?? '*', path: stated[0]! } : undefined;
};

/** Event classes from `aws-lambda-java-events` and `Amazon.Lambda.*Events`, by the trigger each implies. */
const COMPILED_EVENT_TYPES: Readonly<Record<string, EventFamily>> = {
  APIGatewayV2HTTPEvent: { trigger: 'http', payloadFormat: '2.0' },
  APIGatewayHttpApiV2ProxyRequest: { trigger: 'http', payloadFormat: '2.0' },
  APIGatewayProxyRequestEvent: { trigger: 'http', payloadFormat: '1.0' },
  APIGatewayProxyRequest: { trigger: 'http', payloadFormat: '1.0' },
  APIGatewayV2WebSocketEvent: { trigger: 'websocket' },
  SQSEvent: { trigger: 'queue' },
  SNSEvent: { trigger: 'topic' },
  S3Event: { trigger: 'object-storage' },
  S3EventNotification: { trigger: 'object-storage' },
  ScheduledEvent: { trigger: 'schedule' },
  DynamodbEvent: { trigger: 'dynamodb-stream' },
  DynamoDBEvent: { trigger: 'dynamodb-stream' },
  KinesisEvent: { trigger: 'unmapped', sourceType: 'a Kinesis stream' },
  ApplicationLoadBalancerRequestEvent: { trigger: 'unmapped', sourceType: 'an Application Load Balancer' },
  ApplicationLoadBalancerRequest: { trigger: 'unmapped', sourceType: 'an Application Load Balancer' }
};

const compiledEventFamily = (typeName: string | undefined): EventFamily | undefined =>
  typeName === undefined ? undefined : COMPILED_EVENT_TYPES[typeName.split('.').at(-1)!];

/** A Java class implementing the Lambda handler interfaces, and the event class it takes. */
const JAVA_HANDLER =
  /\bclass\s+(\w+)\b[^{]*?\bimplements\b[^{]*?\b(?:RequestHandler\s*<\s*([\w.]+)|RequestStreamHandler\b)/;
/**
 * A .NET Lambda handler method: public, with an `ILambdaContext` last parameter, and the event type before it.
 */
const DOTNET_HANDLER =
  /\bpublic\s+(?:static\s+)?(?:async\s+)?[\w.<>,?[\]\s]+?\s+(\w+)\s*\(\s*(?:(?:\[[^\]]*\]\s*)?([\w.<>]+)\s+\w+\s*,\s*)?ILambdaContext\s+\w+\s*\)/;
/** Event types from `github.com/aws/aws-lambda-go/events`, by the trigger each implies. */
const GO_EVENT_TYPES: Readonly<Record<string, EventFamily>> = {
  APIGatewayV2HTTPRequest: { trigger: 'http', payloadFormat: '2.0' },
  APIGatewayProxyRequest: { trigger: 'http', payloadFormat: '1.0' },
  LambdaFunctionURLRequest: { trigger: 'url' },
  APIGatewayWebsocketProxyRequest: { trigger: 'websocket' },
  SQSEvent: { trigger: 'queue' },
  SNSEvent: { trigger: 'topic' },
  S3Event: { trigger: 'object-storage' },
  DynamoDBEvent: { trigger: 'dynamodb-stream' },
  KinesisEvent: { trigger: 'unmapped', sourceType: 'a Kinesis stream' },
  ALBTargetGroupRequest: { trigger: 'unmapped', sourceType: 'an Application Load Balancer' }
};

/** `lambda.Start(handler)`: a Go `main` package handing a function to the Lambda runtime. */
const GO_LAMBDA_START = /\blambda\.Start(?:WithOptions|Handler)?\s*\(/;
/** The function it hands over: a named one, or a literal with its parameters. */
const GO_STARTED_FUNCTION =
  /\blambda\.Start(?:WithOptions|Handler)?\s*\(\s*(?:([A-Za-z_]\w*)\s*[,)]|func\s*\(([^)]*)\))/;

/**
 * A Go Lambda handler: a `main` package calling `lambda.Start`, in a module (`go.mod`) the buildpack builds. The
 * event type the started function takes says what invokes it; `events.CloudWatchEvent` is either a schedule or an
 * EventBridge rule, and an untyped `json.RawMessage` could be anything, so those get no trigger.
 */
const goHandler = (
  context: ProbeContext,
  path: string,
  original: string
): CompiledHandler | 'no-build-file' | undefined => {
  if (/(?:^|\/)vendor\/|_test\.go$/.test(path)) return undefined;
  // A commented-out `lambda.Start` example in a command's docs, or one in a help text, is not the command's own.
  const raw = maskSource(original, 'go', { strings: 'blank' });
  if (!GO_LAMBDA_START.test(raw) || !/^\s*package\s+main\b/m.test(raw)) return undefined;
  const module = nearestModule(context.files, path, (file, directory) => inDirectory(file, directory) === 'go.mod');
  if (module === undefined) return 'no-build-file';
  // A wrapped or adapted handler (`otelaws.WrapHandler(handler)`, an HTTP router adapter) says nothing about its event.
  const started = GO_STARTED_FUNCTION.exec(raw);
  const parameters =
    started?.[2] ??
    (started?.[1] === undefined ? undefined : new RegExp(`\\bfunc\\s+${started[1]}\\s*\\(([^)]*)\\)`).exec(raw)?.[1]);
  const eventType = /\bevents\.(\w+)/.exec(parameters ?? '')?.[1];
  return {
    family: eventType === undefined ? undefined : GO_EVENT_TYPES[eventType],
    language: 'go',
    // The main package's own directory: a module at the repository root can hold several (`cmd/api`, `cmd/worker`).
    module: posix.dirname(path),
    runtimeVersion: undefined,
    // The line the call is on, quoted as the file has it.
    entryEvidence: citeLine(
      path,
      original.split(/\r?\n/),
      raw.split(/\r?\n/).findIndex((line) => GO_LAMBDA_START.test(line)),
      'functionEntrypoint'
    )
  };
};

/** Handler shapes in languages init does not turn into functions: Rust and Ruby. */
const OTHER_HANDLER_SHAPES: ReadonlyArray<{ extension: RegExp; pattern: RegExp; language: string }> = [
  { extension: /\.rs$/, pattern: /\blambda_runtime::run\s*\(|\bservice_fn\s*\(/, language: 'Rust' },
  { extension: /\.rb$/, pattern: /\bdef\s+(?:self\.)?\w+\s*\(\s*event:\s*,\s*context:\s*\)/, language: 'Ruby' }
];

/** The nearest directory at or above `path` that holds one of `manifests`. */
const nearestModule = (
  files: readonly string[],
  path: string,
  holds: (file: string, directory: string) => boolean
): { directory: string; manifest: string } | undefined => {
  const segments = path.split('/').slice(0, -1);
  for (let length = segments.length; length >= 0; length -= 1) {
    const directory = segments.slice(0, length).join('/') || '.';
    const manifest = files.find((file) => holds(file, directory));
    if (manifest !== undefined) return { directory, manifest };
  }
  return undefined;
};

const inDirectory = (file: string, directory: string): string | undefined => {
  const prefix = directory === '.' ? '' : `${directory}/`;
  if (!file.startsWith(prefix)) return undefined;
  const rest = file.slice(prefix.length);
  return rest.includes('/') ? undefined : rest;
};

const JAVA_BUILD_FILES = new Set(['pom.xml', 'build.gradle', 'build.gradle.kts']);

/** The Java release a Maven or Gradle build file pins. */
const javaRelease = (raw: string): string | undefined =>
  raw.match(/JavaLanguageVersion\.of\(\s*(\d+)\s*\)/)?.[1] ??
  raw.match(/<maven\.compiler\.(?:release|target)>\s*(?:1\.)?(\d+)\s*</)?.[1] ??
  raw.match(/<release>\s*(\d+)\s*<\/release>/)?.[1] ??
  raw.match(/<java\.version>\s*(?:1\.)?(\d+)\s*</)?.[1] ??
  raw.match(/sourceCompatibility\s*=\s*(?:JavaVersion\.VERSION_)?['"]?(?:1\.)?(\d+)['"]?/)?.[1];

/** A handler written in a compiled language, as the platform names it. A Go binary has no handler name. */
type CompiledHandler = {
  family: EventFamily | undefined;
  functionHandler?: string;
  language: 'java' | 'dotnet' | 'go';
  module: string;
  runtimeVersion: string | undefined;
  entryEvidence: Citation | undefined;
};

/**
 * A Java class implementing `RequestHandler`/`RequestStreamHandler`, in a Maven or Gradle module. The handler names
 * the class and its method: `TaxHandler::handleRequest`. Stacktape puts the class's package in front of it.
 */
const javaHandler = async (
  context: ProbeContext,
  path: string,
  raw: string
): Promise<CompiledHandler | 'no-build-file' | undefined> => {
  const match = JAVA_HANDLER.exec(raw);
  if (match === null) return undefined;
  const module = nearestModule(context.files, path, (file, directory) =>
    JAVA_BUILD_FILES.has(inDirectory(file, directory) ?? '')
  );
  if (module === undefined) return 'no-build-file';
  const build = await readText(context, module.manifest, { fullFile: true });
  return {
    family: compiledEventFamily(match[2]),
    functionHandler: `${match[1]}::handleRequest`,
    language: 'java',
    module: module.directory,
    runtimeVersion: build === undefined ? undefined : javaRelease(build),
    entryEvidence: citeFirstMatch(path, raw, JAVA_HANDLER, 'functionEntrypoint')
  };
};

/** A C# method taking an `ILambdaContext`, in a project: `Assembly::Namespace.Class::Method`. */
const dotnetHandler = async (
  context: ProbeContext,
  path: string,
  raw: string
): Promise<CompiledHandler | 'no-build-file' | undefined> => {
  const match = DOTNET_HANDLER.exec(raw);
  if (match === null) return undefined;
  const classes = [...raw.slice(0, match.index).matchAll(/\bclass\s+(\w+)/g)];
  const className = classes.at(-1)?.[1];
  if (className === undefined) return undefined;
  const namespace = /\bnamespace\s+([\w.]+)/.exec(raw)?.[1];
  const module = nearestModule(context.files, path, (file, directory) =>
    (inDirectory(file, directory) ?? '').endsWith('.csproj')
  );
  if (module === undefined) return 'no-build-file';
  const project = await readText(context, module.manifest, { fullFile: true });
  const assembly =
    /<AssemblyName>\s*([\w.]+)\s*<\/AssemblyName>/.exec(project ?? '')?.[1] ??
    posix.basename(module.manifest).replace(/\.csproj$/, '');
  return {
    family: compiledEventFamily(match[2]),
    functionHandler: `${assembly}::${namespace === undefined ? '' : `${namespace}.`}${className}::${match[1]}`,
    language: 'dotnet',
    module: module.directory,
    runtimeVersion: /<TargetFramework>\s*net(\d+)\.\d+\s*</.exec(project ?? '')?.[1],
    entryEvidence: citeFirstMatch(path, raw, DOTNET_HANDLER, 'functionEntrypoint')
  };
};

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
const uniqueHandlerNames = (
  paths: readonly string[],
  preferred: ReadonlyMap<string, string> = new Map()
): Map<string, string> => {
  const names = new Map(paths.map((path) => [path, preferred.get(path) ?? nameFor(path)]));
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

/** `APPROVAL_WORKFLOW_ARN` names the `approvalWorkflow` state machine. */
const stateMachineNameFor = (variable: string): string => {
  const words = variable.replace(/_ARN$/, '').toLowerCase().split('_').filter(Boolean);
  return words.length === 0
    ? defaultDependencyName('state-machine')
    : words.map((word, index) => (index === 0 ? word : word[0]!.toUpperCase() + word.slice(1))).join('');
};

export const lambdaSourceProbe: Probe = {
  name: 'lambda-source',
  run: async (probeContext: ProbeContext): Promise<ProbeOutput> => {
    // SAM is more authoritative: it distinguishes multiple exports in one file and names events.
    let context = probeContext;
    for (const path of ['template.yaml', 'template.yml', 'sam-template.yaml', 'sam-template.yml']) {
      if (!context.files.includes(path)) continue;
      // oxlint-disable-next-line no-await-in-loop -- stop after the first authoritative SAM template.
      const raw = await readText(context, path);
      if (raw !== undefined && /AWS::Serverless-2016-10-31/.test(raw)) return {};
    }
    // Same deference to the Serverless Framework: its manifest names the functions and their
    // events, so pattern-matching the same handler files again would only mint duplicates. A manifest in a package
    // (`apps/api/serverless.yml`) speaks for that package's handlers only; a sibling package's are still read here.
    const serverlessRoots = context.files
      .filter((path) => /(^|\/)serverless\.ya?ml$/.test(path))
      .map((path) => posix.dirname(path));
    if (serverlessRoots.includes('.')) return {};
    if (serverlessRoots.length > 0) {
      context = {
        ...context,
        files: context.files.filter((path) => !serverlessRoots.some((root) => path.startsWith(`${root}/`)))
      };
    }
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
      compiled?: CompiledHandler;
    }> = [];
    const handlerFindings: HandlerFinding[] = [];
    const claimed = new Set<string>();
    const publishers = new Map<string, Publisher>();
    const workflowStarts: WorkflowStart[] = [];
    const directInvokes: DirectInvoke[] = [];
    const stepCandidates: Array<{ path: string; raw: string; entryEvidence: Citation | undefined }> = [];
    const notePublisher = (path: string, raw: string) => {
      const publisher = publisherIn(path, raw);
      if (publisher !== undefined) publishers.set(path, publisher);
      for (const start of workflowStartsIn(path, raw)) {
        if (!workflowStarts.some((known) => known.variable === start.variable)) workflowStarts.push(start);
      }
      directInvokes.push(...directInvokesIn(path, raw));
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
      if (raw === undefined) continue;
      // Exports are read from code alone: a commented-out handler, or one quoted in a tutorial string, is not one.
      const code = maskFile(path, raw, 'blank');
      if (
        HANDLER_DIRECTORY.test(path) &&
        !HANDLER_PATTERN.test(code) &&
        ASYNC_DEFAULT_EXPORT.test(code) &&
        !/\.[jt]sx$/.test(path) &&
        !OTHER_PLATFORM_PATH.test(path) &&
        !OTHER_PLATFORM_SOURCE.test(raw)
      ) {
        // Left unclaimed: the scan below still takes it when it is an untyped Lambda handler (`(event, context)`).
        stepCandidates.push({
          path,
          raw,
          entryEvidence: citeFirstCodeMatch(path, raw, code, ASYNC_DEFAULT_EXPORT, 'functionEntrypoint')
        });
      }
      if (!HANDLER_PATTERN.test(code)) continue;
      // An entry file outside a handlers directory counts only when it names Lambda itself: a Hono or Express app
      // wrapped for Lambda exports `handler` from `src/index.ts`, and so does plenty of code that is not a function.
      if (!HANDLER_DIRECTORY.test(path) && !LAMBDA_SIGNAL.test(raw)) continue;
      claimed.add(path);
      const typed = typedHandler(path, raw, code);
      const inferred = typed === undefined ? inferWithClaims(path, raw) : undefined;
      handlers.push({
        path,
        raw,
        family: typed?.family ?? inferred?.family,
        triggerEvidence: typed?.citation ?? citeInferred(path, raw, inferred?.pattern),
        entryEvidence: citeFirstCodeMatch(path, raw, code, HANDLER_PATTERN, 'functionEntrypoint'),
        pythonHandler: untypedExport(path, code)?.pythonHandler
      });
    }

    // Elsewhere a handler has to say what it is. A handler typed with an AWS Lambda event can live anywhere:
    // `src/api.ts` exporting `default async (event: APIGatewayProxyEventV2)` is a function however its directory is
    // named, and its type says which event invokes it. An untyped one (every Python handler) qualifies when it takes
    // `(event, context)` or reads the fields of one event source, and those fields say which.
    const application = context.files.filter(
      (path) =>
        !claimed.has(path) &&
        !NON_APPLICATION_PATH.test(outsidePackageNamespace(path)) &&
        !NON_APPLICATION_FILE.test(path)
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
      const code = maskFile(path, raw, 'blank');
      const typed = typedHandler(path, raw, code);
      if (typed !== undefined) {
        handlers.push({
          path,
          raw,
          family: typed.family,
          triggerEvidence: typed.citation,
          entryEvidence: citeFirstCodeMatch(path, raw, code, TYPED_EXPORT, 'functionEntrypoint'),
          pythonHandler: undefined
        });
        continue;
      }
      const exported = untypedExport(path, code);
      if (exported === undefined || !exported.eventParameter) continue;
      const inferred = inferWithClaims(path, raw);
      // `(event, context)` is the Lambda signature itself; a schedule literal alone proves nothing about the export.
      if (
        !exported.contextParameter &&
        (inferred === undefined || inferred.pattern === SCHEDULE_LITERAL || inferred.pattern === DOCSTRING_SCHEDULE)
      ) {
        continue;
      }
      handlers.push({
        path,
        raw,
        family: inferred?.family,
        triggerEvidence: citeInferred(path, raw, inferred?.pattern),
        entryEvidence: citeFirstCodeMatch(
          path,
          raw,
          code,
          path.endsWith('.py') ? PYTHON_HANDLER : UNTYPED_JS_EXPORT,
          'functionEntrypoint'
        ),
        pythonHandler: exported.pythonHandler
      });
    }

    // Java and .NET handlers implement the runtime's handler interface. Each needs the build file that compiles it, and
    // the platform's handler name, which the file alone does not give. A Go handler needs its module. Rust and Ruby
    // handlers are reported for the user to add.
    const compiledCandidates = application
      .filter((path) => /\.(?:java|cs|go|rs|rb)$/.test(path))
      .slice(0, MAX_TYPED_CANDIDATES);
    for (const path of compiledCandidates) {
      // oxlint-disable-next-line no-await-in-loop -- bounded, policy-controlled reads in a stable order.
      const raw = await readText(context, path, { fullFile: true });
      if (raw === undefined) continue;
      if (path.endsWith('.java') || path.endsWith('.cs')) {
        // oxlint-disable-next-line no-await-in-loop -- the build file read belongs to this candidate.
        const compiled = await (path.endsWith('.java') ? javaHandler : dotnetHandler)(context, path, raw);
        if (compiled === 'no-build-file') {
          handlerFindings.push({ path, language: path.endsWith('.java') ? 'Java' : '.NET', reason: 'no-build-file' });
        } else if (compiled !== undefined) {
          // Stacktape puts the containing folder's name in front of a Java handler: `shelf/TaxHandler.java` gets
          // `shelf.TaxHandler::handleRequest`. That is the class only when its package is exactly that folder.
          const packageName = /^\s*package\s+([\w.]+)\s*;/m.exec(raw)?.[1];
          if (compiled.language === 'java' && packageName !== posix.basename(posix.dirname(path))) {
            handlerFindings.push({
              path,
              language: 'Java',
              reason: 'java-package',
              ...(packageName === undefined ? {} : { packageName })
            });
          }
          handlers.push({
            path,
            raw,
            family: compiled.family,
            triggerEvidence: undefined,
            entryEvidence: compiled.entryEvidence,
            pythonHandler: undefined,
            compiled
          });
        }
        continue;
      }
      if (path.endsWith('.go')) {
        const compiled = goHandler(context, path, raw);
        if (compiled === 'no-build-file') handlerFindings.push({ path, language: 'Go', reason: 'no-build-file' });
        else if (compiled !== undefined) {
          handlers.push({
            path,
            raw,
            family: compiled.family,
            triggerEvidence: undefined,
            entryEvidence: compiled.entryEvidence,
            pythonHandler: undefined,
            compiled
          });
        }
        continue;
      }
      const other = OTHER_HANDLER_SHAPES.find((shape) => shape.extension.test(path) && shape.pattern.test(raw));
      if (other !== undefined) handlerFindings.push({ path, language: other.language, reason: 'unsupported-language' });
    }

    // Every HTTP handler would otherwise get the catch-all route on the one HTTP API, and CloudFormation rejects two
    // `* /{proxy+}` routes. A lone HTTP handler takes it unless the path parameters it reads name its route; several
    // have to be given their routes, unless the source states each one.
    const httpHandlerCount = handlers.filter(({ family }) => family?.trigger === 'http').length;
    const routes = new Map(
      handlers.flatMap((handler) => {
        const route = handler.family?.trigger === 'http' ? handlerRoute(handler.raw) : undefined;
        return route === undefined ? [] : [[handler.path, route] as const];
      })
    );

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
          addressedBy: [...new Set(addressedBy)],
          evidence,
          source: 'probe'
        });
      } else {
        existing.addressedBy = [...new Set([...existing.addressedBy, ...addressedBy])];
        existing.evidence = [...existing.evidence, ...evidence].slice(0, 3);
      }
      return name;
    };

    // A Java or .NET module holding one handler is that function: `functions/tax` is `tax`, not `TaxHandler`. A Go
    // handler is named like any other file: `functions/ping/main.go` is `ping`, `lambdas/resize.go` is `resize`.
    const preferredNames = new Map<string, string>();
    for (const { path, compiled } of handlers) {
      if (compiled === undefined || compiled.language === 'go' || compiled.module === '.') continue;
      const siblings = handlers.filter((handler) => handler.compiled?.module === compiled.module);
      if (siblings.length === 1) preferredNames.set(path, posix.basename(compiled.module));
    }

    for (const { path, raw, family, triggerEvidence, entryEvidence, pythonHandler, compiled } of handlers) {
      const evidence = triggerEvidence === undefined ? [] : [triggerEvidence];
      const triggers: FunctionTrigger[] = [];
      if (family?.trigger === 'http') {
        const route = routes.get(path);
        const readParameters = pathParametersIn(raw).filter((parameter) => parameter !== 'proxy');
        const authorization = readsJwtClaims(path, raw) ? { authorization: 'jwt' as const } : {};
        triggers.push(
          route !== undefined
            ? { type: 'http', ...route, payloadFormat: family.payloadFormat, ...authorization }
            : httpHandlerCount === 1
              ? // The handler routes on its own (`event.rawPath`), so every method and path reaches it. Path parameters it
                // reads by name arrive empty on this route, which composition reports.
                {
                  type: 'http',
                  method: '*',
                  path: '/{proxy+}',
                  payloadFormat: family.payloadFormat,
                  ...(readParameters.length === 0 ? {} : { pathParameters: readParameters }),
                  ...authorization
                }
              : { type: 'unmapped', sourceType: UNROUTED_HTTP_SOURCE }
        );
      } else if (family?.trigger === 'schedule') {
        const rate = scheduleIn(raw);
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
      } else if (family?.trigger === 'url') {
        triggers.push({ type: 'url' });
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
            publisher.path !== path && publisher.entries.some((entry) => detailTypes.includes(entry.detailType))
        );
        const entries = senders.flatMap((sender) =>
          sender.entries.filter((entry) => detailTypes.includes(entry.detailType))
        );
        if (entries.length === 0) {
          triggers.push({ type: 'unmapped', sourceType: EVENTBRIDGE_RULE_SOURCE });
        } else {
          // Every matching entry has to say its source; otherwise the pattern matches the detail type alone.
          const sources = entries.every((entry) => entry.source !== undefined)
            ? [...new Set(entries.map((entry) => entry.source!))]
            : [];
          triggers.push({
            type: 'event-bus',
            dependencyName: ensureDependency(
              'event-bus',
              senders.flatMap((sender) => (sender.evidence === undefined ? [] : [sender.evidence])).slice(0, 3),
              entries.map((entry) => entry.busVariable)
            ),
            detailTypes: detailTypes.filter((detailType) => entries.some((entry) => entry.detailType === detailType)),
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
        name: preferredNames.get(path) ?? nameFor(path),
        path: compiled?.module ?? (posix.dirname(path) === '.' ? '.' : posix.dirname(path)),
        processType: path,
        language: compiled?.language ?? languageFor(path),
        ...(compiled?.runtimeVersion === undefined ? {} : { runtimeVersion: compiled.runtimeVersion }),
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: path,
        // Stacktape calls a Python module's `handler`; AWS's own examples name it `lambda_handler`.
        ...(pythonHandler === 'lambda_handler' && !/^def\s+handler\s*\(/m.test(raw)
          ? { functionHandler: pythonHandler }
          : compiled?.functionHandler === undefined
            ? {}
            : { functionHandler: compiled.functionHandler }),
        functionTriggers: triggers,
        environmentVariables: [],
        evidence: [...(entryEvidence === undefined ? [] : [entryEvidence]), ...evidence],
        source: 'probe'
      });
    }

    // A step candidate the scan above already took as a Lambda handler is that handler.
    const candidates = stepCandidates.filter(
      (candidate) => !handlers.some((handler) => handler.path === candidate.path)
    );
    const finalNames = uniqueHandlerNames(
      [...services.map((service) => service.functionEntrypoint!), ...candidates.map((candidate) => candidate.path)],
      preferredNames
    );
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

    // A function the code invokes directly (`InvokeCommand`, boto3 `invoke`) has an invoker, so it is no workflow
    // step. An invocation whose target init cannot name could be any of them, so no order is trusted then.
    const candidateNames = new Map(candidates.map((candidate) => [candidate.path, finalNames.get(candidate.path)!]));
    const invokedNames = new Set<string>();
    let unattributedInvoke = false;
    for (const invoke of directInvokes) {
      const target = invokeTargetName(invoke.target, [
        ...services.map((service) => service.name),
        ...candidateNames.values()
      ]);
      if (target === undefined) unattributedInvoke = true;
      else invokedNames.add(target);
    }
    for (const service of services) {
      if ((service.functionTriggers ?? []).length > 0 || !invokedNames.has(service.name)) continue;
      service.functionTriggers = [{ type: 'unmapped', sourceType: DIRECT_INVOCATION_SOURCE }];
    }

    // A state machine for each variable code starts executions with. Its steps are the functions nothing else invokes,
    // and only when there is one machine and the data flow orders them.
    const untriggered = services.filter(
      (service) =>
        (service.functionTriggers ?? []).length === 0 &&
        !uncertainties.some(
          (uncertainty) => uncertainty.kind === 'schedule-unknown' && uncertainty.serviceName === service.name
        )
    );
    const steps = (start: WorkflowStart) =>
      workflowStarts.length === 1 && !unattributedInvoke
        ? orderWorkflowSteps(start.inputKeys, [
            ...untriggered.map((service) => {
              const handler = handlers.find((candidate) => candidate.path === service.functionEntrypoint)!;
              return { name: service.name, path: handler.path, shape: stepShapeOf(handler.path, handler.raw) };
            }),
            ...candidates
              .filter((candidate) => !invokedNames.has(candidateNames.get(candidate.path)!))
              .map((candidate) => ({
                name: candidateNames.get(candidate.path)!,
                path: candidate.path,
                shape: stepShapeOf(candidate.path, candidate.raw)
              }))
          ])
        : undefined;
    // A default export the code invokes with the Lambda API is a function, invoked directly.
    for (const candidate of candidates) {
      const name = candidateNames.get(candidate.path)!;
      if (!invokedNames.has(name)) continue;
      services.push({
        name,
        path: posix.dirname(candidate.path) === '.' ? '.' : posix.dirname(candidate.path),
        processType: candidate.path,
        language: languageFor(candidate.path),
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: candidate.path,
        functionTriggers: [{ type: 'unmapped', sourceType: DIRECT_INVOCATION_SOURCE }],
        environmentVariables: [],
        evidence: candidate.entryEvidence === undefined ? [] : [candidate.entryEvidence],
        source: 'probe'
      });
    }
    for (const start of workflowStarts) {
      const ordered = steps(start);
      // A default export with no Lambda signature is a function only as a step of this workflow.
      for (const step of ordered ?? []) {
        const candidate = candidates.find((entry) => entry.path === step.path);
        if (candidate === undefined) continue;
        services.push({
          name: step.name,
          path: posix.dirname(candidate.path) === '.' ? '.' : posix.dirname(candidate.path),
          processType: candidate.path,
          language: languageFor(candidate.path),
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: candidate.path,
          functionTriggers: [],
          environmentVariables: [],
          evidence: candidate.entryEvidence === undefined ? [] : [candidate.entryEvidence],
          source: 'probe'
        });
      }
      const workflowSteps = ordered?.map((step) => step.name);
      dependencies.push({
        name: stateMachineNameFor(start.variable),
        kind: 'state-machine',
        extensions: [],
        consumedBy: [],
        addressedBy: [start.variable],
        ...(workflowSteps === undefined ? {} : { workflowSteps }),
        evidence: start.evidence === undefined ? [] : [start.evidence],
        source: 'probe'
      });
    }

    return services.length === 0 && dependencies.length === 0 && handlerFindings.length === 0
      ? {}
      : {
          services,
          ...(dependencies.length === 0 ? {} : { dependencies }),
          ...(uncertainties.length === 0 ? {} : { uncertainties }),
          ...(handlerFindings.length === 0 ? {} : { handlerFindings })
        };
  }
};
