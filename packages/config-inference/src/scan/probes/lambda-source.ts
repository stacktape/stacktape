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
  | { trigger: 'queue' | 'topic' | 'object-storage' | 'schedule' }
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
  { names: ['SQSEvent', 'SQSHandler'], family: { trigger: 'queue' } },
  { names: ['SNSEvent', 'SNSHandler'], family: { trigger: 'topic' } },
  { names: ['S3Event', 'S3Handler', 'S3CreateEvent'], family: { trigger: 'object-storage' } },
  { names: ['ScheduledEvent', 'ScheduledHandler'], family: { trigger: 'schedule' } },
  {
    names: ['DynamoDBStreamEvent', 'DynamoDBStreamHandler'],
    family: { trigger: 'unmapped', sourceType: 'a DynamoDB stream' }
  },
  {
    names: ['KinesisStreamEvent', 'KinesisStreamHandler'],
    family: { trigger: 'unmapped', sourceType: 'a Kinesis stream' }
  },
  {
    names: ['ALBEvent', 'ALBHandler'],
    family: { trigger: 'unmapped', sourceType: 'an Application Load Balancer' }
  },
  {
    names: ['EventBridgeEvent', 'EventBridgeHandler'],
    family: { trigger: 'unmapped', sourceType: 'an EventBridge rule' }
  }
];

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
const NON_APPLICATION_FILE = /\.(?:test|spec|stories)\.[^.]+$|\.d\.ts$|(?:^|\/)[^/]*\.config\.[cm]?[jt]s$/i;
const MAX_TYPED_CANDIDATES = 400;

type TypedHandler = { family: EventFamily; citation: Citation | undefined };

const typedHandler = (path: string, raw: string): TypedHandler | undefined => {
  if (!/['"]aws-lambda['"]/.test(raw)) return undefined;
  for (const pattern of TYPED_EXPORT_PATTERNS) {
    const typeName = pattern.exec(raw)?.[1];
    if (typeName === undefined) continue;
    const entry = EVENT_TYPES.find((candidate) => candidate.names.includes(typeName))!;
    const family: EventFamily =
      entry.family.trigger === 'unmapped' && SCHEDULED_EVENTBRIDGE.test(raw) ? { trigger: 'schedule' } : entry.family;
    return {
      family,
      citation: citeFirstMatchOnly(path, raw, new RegExp(`\\b${typeName}\\b`), 'functionTriggers')
    };
  }
  return undefined;
};

const languageFor = (path: string): string =>
  path.endsWith('.py') ? 'python' : path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript';

const nameFor = (path: string): string => {
  const segments = path.split('/');
  const stem = posix.basename(path).replace(/\.[^.]+$/, '');
  if (!['handler', 'index'].includes(stem.toLowerCase())) return stem;
  for (let index = segments.length - 2; index >= 0; index -= 1) {
    const segment = segments[index]!;
    if (!['src', 'handlers', 'handler', 'functions', 'function', 'lambdas', 'lambda'].includes(segment.toLowerCase())) {
      return segment;
    }
  }
  return 'handler';
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

    const candidates = context.files.filter(
      (path) =>
        /\.(?:[cm]?js|tsx?|py)$/.test(path) &&
        (/(?:^|\/)(?:functions?|lambdas?|handlers?)(?:\/|$)/i.test(path) || ENTRY_FILE.test(path))
    );
    const services: ServiceFactInput[] = [];
    const dependencies: DependencyFact[] = [];
    const uncertainties: Uncertainty[] = [];
    const claimed = new Set<string>();
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- each candidate is small and reads are policy controlled.
      const raw = await readText(context, path);
      if (raw === undefined || !HANDLER_PATTERN.test(raw)) continue;
      // An entry file outside a handlers directory counts only when it names Lambda itself: a Hono or Express app
      // wrapped for Lambda exports `handler` from `src/index.ts`, and so does plenty of code that is not a function.
      if (!/(?:^|\/)(?:functions?|lambdas?|handlers?)(?:\/|$)/i.test(path) && !LAMBDA_SIGNAL.test(raw)) continue;
      const citation = citeFirstMatch(path, raw, HANDLER_PATTERN, 'functionEntrypoint');
      claimed.add(path);
      services.push({
        name: nameFor(path),
        path: posix.dirname(path) === '.' ? '.' : posix.dirname(path),
        processType: path,
        language: languageFor(path),
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: path,
        functionTriggers: [],
        environmentVariables: [],
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    // A handler typed with an AWS Lambda event can live anywhere: `src/api.ts` exporting
    // `default async (event: APIGatewayProxyEventV2)` is a function however its directory is named, and its type says
    // which event invokes it.
    const typedCandidates = context.files
      .filter(
        (path) =>
          /\.(?:[cm]?[jt]s|tsx)$/.test(path) && !NON_APPLICATION_PATH.test(path) && !NON_APPLICATION_FILE.test(path)
      )
      .slice(0, MAX_TYPED_CANDIDATES);
    const typedHandlers: Array<{ path: string; raw: string; typed: TypedHandler }> = [];
    for (const path of typedCandidates) {
      // oxlint-disable-next-line no-await-in-loop -- bounded, policy-controlled reads in a stable order.
      const raw = await readText(context, path, { fullFile: true });
      if (raw === undefined) continue;
      const typed = typedHandler(path, raw);
      if (typed !== undefined) typedHandlers.push({ path, raw, typed });
    }
    // Every HTTP-typed handler would otherwise get the catch-all route on the one HTTP API, and CloudFormation rejects
    // two `* /{proxy+}` routes. Only a lone HTTP handler is the API; several have to be given their routes.
    const httpHandlerCount = typedHandlers.filter(({ typed }) => typed.family.trigger === 'http').length;

    for (const { path, raw, typed } of typedHandlers) {
      const evidence = typed.citation === undefined ? [] : [typed.citation];
      const name = nameFor(path);
      const triggers: FunctionTrigger[] = [];
      const { family } = typed;
      if (family.trigger === 'http') {
        triggers.push(
          httpHandlerCount === 1
            ? // The handler routes on its own (`event.rawPath`), so every method and path reaches it.
              { type: 'http', method: '*', path: '/{proxy+}', payloadFormat: family.payloadFormat }
            : { type: 'unmapped', sourceType: UNROUTED_HTTP_SOURCE }
        );
      } else if (family.trigger === 'schedule') {
        const rate = SCHEDULE_LITERAL.exec(raw)?.[1];
        if (rate === undefined) {
          uncertainties.push({
            kind: 'schedule-unknown',
            // Keyed by file until the names are final below.
            id: `schedule-unknown:${path}`,
            blocksDeploy: false,
            evidence,
            source: 'probe',
            serviceName: name,
            suggestions: []
          });
        } else {
          triggers.push({ type: 'schedule', rate });
        }
      } else if (family.trigger === 'unmapped') {
        triggers.push({ type: 'unmapped', sourceType: family.sourceType });
      } else {
        // Which queue, topic or bucket the code does not say; the default name is the one every other probe uses
        // for the same kind, so it folds into theirs, and Stacktape-named reads later rename it.
        const kind = family.trigger === 'queue' ? 'queue' : family.trigger === 'topic' ? 'topic' : 'object-storage';
        const dependencyName = defaultDependencyName(kind);
        triggers.push({ type: family.trigger, dependencyName });
        if (!dependencies.some((dependency) => dependency.name === dependencyName)) {
          dependencies.push({
            name: dependencyName,
            kind,
            extensions: [],
            consumedBy: [],
            addressedBy: [],
            evidence,
            source: 'probe'
          });
        }
      }

      const existing = services.find((service) => service.functionEntrypoint === path);
      if (existing !== undefined) {
        existing.functionTriggers = [...(existing.functionTriggers ?? []), ...triggers];
        existing.evidence = [...(existing.evidence ?? []), ...evidence];
        continue;
      }
      if (claimed.has(path)) continue;
      claimed.add(path);
      const exportCitation = citeFirstMatch(path, raw, TYPED_EXPORT, 'functionEntrypoint');
      services.push({
        name,
        path: posix.dirname(path) === '.' ? '.' : posix.dirname(path),
        processType: path,
        language: languageFor(path),
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: path,
        functionTriggers: triggers,
        environmentVariables: [],
        evidence: [...(exportCitation === undefined ? [] : [exportCitation]), ...evidence],
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
