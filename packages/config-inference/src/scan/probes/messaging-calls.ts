/**
 * Code that publishes to an SNS topic or sends to an SQS queue whose address it reads from the environment:
 * `publish(topic_arn: ENV.fetch('PARCEL_TOPIC_ARN'), ...)`, `new PublishCommand({ TopicArn: process.env.TOPIC_ARN })`,
 * `sqs.send_message(QueueUrl=os.environ['JOBS_QUEUE_URL'])`.
 *
 * The call proves the resource exists, in every language. A package manifest proves it only for JavaScript, and only
 * at the root or a workspace member: a Rails service in `api/` with `aws-sdk-sns` in its own Gemfile otherwise
 * produced no topic at all. The variable is not claimed as the resource's address: the source scan binds it to the
 * services that read it, where `addressedBy` would hand it to every service near the resource as well.
 */

import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

const NAME = '([A-Z][A-Z0-9_]{2,})';

/** An environment read, in the languages the environment scan reads. `name` is the variable's name or a pattern. */
const environmentRead = (name: string): string =>
  [
    `process\\.env\\.${name}`,
    `process\\.env\\[\\s*['"\`]${name}['"\`]`,
    `os\\.(?:environ(?:\\.get\\(|\\[)|getenv\\()\\s*['"]${name}['"]`,
    `ENV(?:\\.fetch\\(|\\[)\\s*['"]${name}['"]`,
    `os\\.(?:Getenv|LookupEnv)\\(\\s*"${name}"`,
    `System\\.getenv\\(\\s*"${name}"`,
    `Environment\\.GetEnvironmentVariable\\(\\s*"${name}"`
  ].join('|');

/** A value that is an environment read, possibly wrapped in calls: Go's `aws.String(os.Getenv("TOPIC_ARN"))`. */
const ENVIRONMENT_VALUE = new RegExp(`^(?:[A-Za-z_][\\w.]*\\(\\s*)*(?:${environmentRead(NAME)})`);

const variableIn = (value: string): string | undefined =>
  ENVIRONMENT_VALUE.exec(value)
    ?.slice(1)
    .find((group) => group !== undefined);

/**
 * The request field that names the target, in each SDK's spelling (`TopicArn`, `topic_arn`, Java's `.topicArn(`), and the
 * calls and request types it is the target of. A field anywhere else is data: `message_body: { topic_arn: ... }` on an
 * SQS send names someone else's topic.
 */
const TARGETS: ReadonlyArray<{
  kind: Extract<DependencyKind, 'topic' | 'queue'>;
  field: RegExp;
  calls: RegExp;
  requests: RegExp;
}> = [
  {
    kind: 'topic',
    field: /\b(?:TopicArn|topic_arn)\b\s*(?::|=(?!=))\s*|\.topicArn\s*\(\s*/g,
    calls: /^(?:publish|Publish|PublishCommand|PublishAsync|publishAsync)$/,
    requests: /^(?:PublishInput|PublishRequest)$/
  },
  {
    kind: 'queue',
    field: /\b(?:QueueUrl|queue_url)\b\s*(?::|=(?!=))\s*|\.queueUrl\s*\(\s*/g,
    calls:
      /^(?:send_message|send_message_batch|sendMessage|sendMessageBatch|SendMessage|SendMessageBatch|SendMessageCommand|SendMessageBatchCommand|SendMessageAsync|SendMessageBatchAsync)$/,
    requests: /^(?:SendMessageInput|SendMessageRequest|SendMessageBatchInput|SendMessageBatchRequest)$/
  }
];

type Opener = { character: '(' | '{' | '['; callee: string };

/**
 * The brackets open at each of `positions`, innermost last, and the name right before each one (`PublishCommand` for
 * `new PublishCommand({`), skipping strings and comments. A position inside a string or comment gets no entry.
 */
const openersAt = (raw: string, positions: readonly number[], hashComments: boolean): Map<number, Opener[]> => {
  const wanted = new Set(positions);
  const result = new Map<number, Opener[]>();
  const stack: Opener[] = [];
  let quote: string | undefined;
  let comment: 'line' | 'block' | undefined;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index]!;
    if (comment === 'line') {
      if (character === '\n') comment = undefined;
      continue;
    }
    if (comment === 'block') {
      if (character === '*' && raw[index + 1] === '/') {
        comment = undefined;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (wanted.has(index)) result.set(index, [...stack]);
    if (character === '"' || character === "'" || character === '`') quote = character;
    else if (character === '/' && raw[index + 1] === '/') comment = 'line';
    else if (character === '/' && raw[index + 1] === '*') comment = 'block';
    else if (character === '#' && hashComments) comment = 'line';
    else if (character === '(' || character === '{' || character === '[') {
      const callee = /([A-Za-z_$][\w$]*)\s*$/.exec(raw.slice(Math.max(0, index - 80), index))?.[1] ?? '';
      stack.push({ character, callee });
    } else if (character === ')' || character === '}' || character === ']') stack.pop();
  }
  return result;
};

/**
 * Whether a target field at this nesting is the call's own: an argument of the call (`publish(topic_arn: ...)`,
 * `publish(TopicArn=...)`), a field of the object passed to it (`new PublishCommand({ TopicArn })`), or a field of
 * its request type (`&sns.PublishInput{TopicArn: ...}`, `new PublishRequest { TopicArn = ... }`).
 */
const isCallTarget = (openers: readonly Opener[], target: (typeof TARGETS)[number]): boolean => {
  const inner = openers.at(-1);
  const outer = openers.at(-2);
  if (inner === undefined) return false;
  if (inner.character === '(') return target.calls.test(inner.callee);
  if (inner.character !== '{') return false;
  if (target.requests.test(inner.callee)) return true;
  return inner.callee === '' && outer?.character === '(' && target.calls.test(outer.callee);
};

/** Java's builder: `PublishRequest.builder().topicArn(...)`, in the same statement. */
const isBuilderTarget = (raw: string, index: number, target: (typeof TARGETS)[number]): boolean => {
  const statement =
    raw
      .slice(Math.max(0, index - 400), index)
      .split(/[;{}]/)
      .at(-1) ?? '';
  const type = /\b(\w+)\s*\.\s*builder\s*\(\s*\)/.exec(statement)?.[1];
  return type !== undefined && target.requests.test(type);
};

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|py|rb|go|java|kt|cs|php)$/;
const NON_APPLICATION_PATH =
  /(?:^|\/)(?:node_modules|vendor|dist|build|out|\.next|\.output|\.stacktape|\.sst|cdk\.out|\.aws-sam|coverage|tests?|__tests__|__mocks__|spec|e2e|cypress|fixtures|examples?|docs?)(?:\/|$)/i;
const NON_APPLICATION_FILE = /\.(?:test|spec|stories)\.[^.]+$|\.d\.ts$|(?:^|\/)(?:test_[^/]*|[^/]*_test)\.(?:py|go)$/i;
const MAX_FILES = 400;

/** Infrastructure code declares its own topics and queues; those probes name them, so this one stays out of the way. */
const DECLARES_INFRASTRUCTURE = (files: readonly string[]): boolean =>
  files.some(
    (path) =>
      /(?:^|\/)serverless\.ya?ml$|(?:^|\/)[^/]+\.tf$|^Pulumi\.ya?ml$/.test(path) ||
      ['cdk.json', 'sst.config.ts', 'sst.config.js', 'template.yaml', 'template.yml', 'sam-template.yaml'].includes(
        path
      )
  );

/**
 * The variable a target field's value reads: directly (`TopicArn: process.env.TOPIC_ARN`, `aws.String(os.Getenv("X"))`)
 * or through one local name the file assigns from the environment (`const topicArn = process.env.TOPIC_ARN` ...
 * `TopicArn: topicArn`).
 */
const targetVariable = (raw: string, valueStart: number): string | undefined => {
  const value = raw.slice(valueStart, valueStart + 160);
  const direct = variableIn(value);
  if (direct !== undefined) return direct;
  const local = /^([A-Za-z_]\w*)\b(?!\s*[.([])/.exec(value)?.[1];
  if (local === undefined) return undefined;
  const assignment = new RegExp(`\\b${local}\\s*(?::=|=(?!=))\\s*([^\\n]{0,160})`).exec(raw);
  return assignment === null ? undefined : variableIn(assignment[1]!);
};

export const messagingCallsProbe: Probe = {
  name: 'messaging-calls',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    if (DECLARES_INFRASTRUCTURE(context.files)) return {};
    const candidates = context.files
      .filter((path) => SOURCE_FILE.test(path) && !NON_APPLICATION_PATH.test(path) && !NON_APPLICATION_FILE.test(path))
      .slice(0, MAX_FILES);
    const found = new Map<'topic' | 'queue', Map<string, DependencyFact['evidence']>>();
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- bounded, policy-controlled reads in a stable order.
      const raw = await readText(context, path, { fullFile: true });
      if (raw === undefined) continue;
      const matches = TARGETS.flatMap((target) => [...raw.matchAll(target.field)].map((match) => ({ target, match })));
      if (matches.length === 0) continue;
      const openers = openersAt(
        raw,
        matches.map(({ match }) => match.index ?? 0),
        /\.(?:rb|py|php)$/.test(path)
      );
      for (const { target, match } of matches) {
        const { kind } = target;
        const index = match.index ?? 0;
        const stack = openers.get(index);
        if (stack === undefined) continue;
        const own = match[0].startsWith('.') ? isBuilderTarget(raw, index, target) : isCallTarget(stack, target);
        if (!own) continue;
        const variable = targetVariable(raw, index + match[0].length);
        if (variable === undefined) continue;
        const variables = found.get(kind) ?? new Map<string, DependencyFact['evidence']>();
        if (!variables.has(variable)) {
          // The read itself, not its line: the line can hold the message being published.
          const citation = citeFirstMatchOnly(path, raw, new RegExp(environmentRead(variable)), 'addressedBy');
          variables.set(variable, citation === undefined ? [] : [citation]);
        }
        found.set(kind, variables);
      }
    }
    // One variable names the project's one topic (or queue), which every other probe calls by the same default name.
    // Two variables can be two resources or one, and the source scan could bind neither, so neither is claimed.
    const dependencies: DependencyFact[] = [...found].flatMap(([kind, variables]) => {
      const [only, ...others] = variables;
      if (only === undefined || others.length > 0) return [];
      const [, evidence] = only;
      return [
        {
          name: defaultDependencyName(kind),
          kind,
          extensions: [],
          consumedBy: [],
          addressedBy: [],
          evidence,
          source: 'probe' as const
        }
      ];
    });
    return dependencies.length === 0 ? {} : { dependencies };
  }
};
