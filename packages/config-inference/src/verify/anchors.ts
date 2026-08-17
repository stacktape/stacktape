/**
 * What evidence for a given claim has to look like.
 *
 * A citation proves that a line exists and says something. It does not prove that what the line
 * says supports the claim attached to it — a model can cite a real import of Prisma in support of
 * "this application uses MongoDB", and a check that only locates quotes will wave it through.
 *
 * Closing that gap normally means asking a second model, which costs money and introduces the same
 * class of error it is meant to catch. It is unnecessary here for one structural reason: **the
 * vocabulary is closed**. There are finitely many dependency kinds, so for each one we can write
 * down in advance what its evidence must mention. A small set of regular expressions
 * replace a judgement call.
 *
 * These are deliberately generous. An anchor is a check against obvious misattribution, not a
 * classifier — it should almost never reject a correct claim, and it only needs to reject the
 * confident nonsense.
 */

import type { DependencyKind } from '../facts/dependency';
import type { FunctionTrigger } from '../facts/service';

export type AnchorRule = {
  /** Evidence must match at least one of these. */
  patterns: readonly RegExp[];
  /** Named in feedback so a failing agent is told what would satisfy the check. */
  expectation: string;
};

export const DEPENDENCY_ANCHORS: Record<DependencyKind, AnchorRule> = {
  postgres: {
    patterns: [/\bpg\b/i, /postgres/i, /psycopg/i, /\bpgx\b/i, /pg-promise/i, /asyncpg/i, /POSTGRES_/],
    expectation: 'a Postgres driver, connection string, or POSTGRES_* variable'
  },
  mysql: {
    patterns: [/mysql/i, /mariadb/i, /pymysql/i, /MYSQL_/],
    expectation: 'a MySQL or MariaDB driver, connection string, or MYSQL_* variable'
  },
  mssql: {
    patterns: [/mssql/i, /sqlserver/i, /sql server/i, /tedious/i, /pyodbc/i],
    expectation: 'a SQL Server driver or connection string'
  },
  mongodb: {
    patterns: [/mongo/i, /mongoose/i, /pymongo/i, /MONGO/],
    expectation: 'a MongoDB driver, connection string, or MONGO* variable'
  },
  sqlite: {
    patterns: [/sqlite/i, /\.db\b/, /\.sqlite3?\b/, /better-sqlite/i, /aiosqlite/i],
    expectation: 'a SQLite driver or a .db/.sqlite file path'
  },
  redis: {
    patterns: [/redis/i, /ioredis/i, /REDIS_/, /bullmq/i, /\bbull\b/i, /celery/i],
    expectation: 'a Redis client, REDIS_* variable, or a queue library that runs on Redis'
  },
  'object-storage': {
    patterns: [/\bs3\b/i, /aws-sdk/i, /boto3/i, /minio/i, /BUCKET/i, /putObject/i, /getSignedUrl/i],
    expectation: 'an S3-compatible client call or a bucket name'
  },
  dynamodb: {
    patterns: [/dynamo/i, /DocumentClient/, /DYNAMODB/i],
    expectation: 'a DynamoDB client or table reference'
  },
  queue: {
    patterns: [/\bsqs\b/i, /@aws-sdk\/client-sqs/i, /SQS_QUEUE/i],
    expectation: 'an SQS client, queue reference, or SQS_QUEUE* variable'
  },
  topic: {
    patterns: [/\bsns\b/i, /@aws-sdk\/client-sns/i, /SNS_TOPIC/i, /AWS::SNS::Topic/i],
    expectation: 'an SNS client or topic reference'
  },
  amqp: {
    patterns: [/rabbitmq/i, /\bamqp\b/i, /\bpika\b/i, /\bbunny\b/i, /\blapin\b/i],
    expectation: 'a RabbitMQ or AMQP client'
  },
  search: {
    patterns: [/elasticsearch/i, /opensearch/i, /meilisearch/i, /typesense/i, /\bsolr\b/i],
    expectation: 'a search-engine client or endpoint'
  },
  email: {
    patterns: [/nodemailer/i, /\bresend\b/i, /sendgrid/i, /\bses\b/i, /\bsmtp\b/i, /SMTP_/, /MAIL_/, /postmark/i],
    expectation: 'a mail client, SMTP settings, or MAIL_/SMTP_* variables'
  },
  kafka: {
    patterns: [/kafka/i, /confluent/i, /\bmsk\b/i],
    expectation: 'a Kafka client or broker list'
  }
};

/** Signals that something in fact serves HTTP, as opposed to being asserted to. */
const HTTP_PATTERNS: readonly RegExp[] = [
  /\.listen\s*\(/,
  /createServer/,
  /app\.(get|post|put|patch|delete|use|route)\s*\(/i,
  /"(?:express|fastify|next|nuxt|hono|koa|astro|@remix-run\/node|@sveltejs\/kit)"\s*:/i,
  /@(Get|Post|Controller|RestController|RequestMapping)\b/,
  /FastAPI|Flask|Django|Streamlit|Sinatra|Rails|Gin|Echo|Fiber|Axum|Actix/i,
  /http\.Handle|ServeMux|net\/http/,
  /EXPOSE\s+\d+/i,
  /uvicorn|gunicorn|hypercorn|puma|unicorn/i,
  /Type:\s*(?:Api|HttpApi)\b/i
];

const FUNCTION_HANDLER_PATTERNS: readonly RegExp[] = [
  /export\s+(?:const|let|var)\s+handler\b/,
  /export\s+(?:async\s+)?function\s+handler\b/,
  /def\s+(?:lambda_handler|handler|\w+_handler)\s*\(/,
  /(?:module\.)?exports(?:\.handler)?\s*=/,
  /public\s+.*\s+handleRequest\s*\(/
];

const TRIGGER_PATTERNS: Record<FunctionTrigger['type'], readonly RegExp[]> = {
  http: [/Type:\s*(?:Api|HttpApi)\b/i, /APIGatewayProxyEvent|APIGatewayV2HTTPEvent/i],
  queue: [/Type:\s*SQS\b/i, /SQSEvent|SQSHandler|Records.*body/i],
  topic: [/Type:\s*SNS\b/i, /SNSEvent|SNSHandler/i],
  'object-storage': [/Type:\s*S3\b/i, /S3Event|S3Handler|ObjectCreated/i],
  schedule: [/Type:\s*Schedule\b/i, /ScheduledEvent|scheduleRate|\brate\s*\(|\bcron\s*\(/i]
};

export type AnchorOutcome = { satisfied: true } | { satisfied: false; expectation: string };

const anyMatch = (patterns: readonly RegExp[], text: string): boolean => patterns.some((pattern) => pattern.test(text));

/**
 * Whether evidence text plausibly supports a dependency of this kind.
 *
 * `evidenceText` should be the cited quotes plus the surrounding lines — the point is to look at
 * what the agent actually pointed at, not at the whole repository, which would match everything.
 */
export const checkDependencyAnchor = (kind: DependencyKind, evidenceText: string): AnchorOutcome => {
  const rule = DEPENDENCY_ANCHORS[kind];
  return anyMatch(rule.patterns, evidenceText)
    ? { satisfied: true }
    : { satisfied: false, expectation: rule.expectation };
};

export const checkFunctionEntrypointAnchor = (fileContents: string): AnchorOutcome =>
  anyMatch(FUNCTION_HANDLER_PATTERNS, fileContents)
    ? { satisfied: true }
    : {
        satisfied: false,
        expectation: 'an exported Lambda-compatible handler'
      };

export const checkFunctionTriggerAnchor = (trigger: FunctionTrigger, evidenceText: string): AnchorOutcome => {
  if (!anyMatch(TRIGGER_PATTERNS[trigger.type], evidenceText)) {
    return {
      satisfied: false,
      expectation: `a declared ${trigger.type} event`
    };
  }
  if (trigger.type === 'http' && !evidenceText.includes(trigger.path)) {
    return {
      satisfied: false,
      expectation: `the route ${trigger.path} in the declared HTTP event`
    };
  }
  if (trigger.type === 'schedule' && !evidenceText.includes(trigger.rate)) {
    return {
      satisfied: false,
      expectation: `the schedule ${trigger.rate} in the declared event`
    };
  }
  return { satisfied: true };
};

/**
 * A claimed port must appear literally in its evidence.
 *
 * The strictest rule here, and the one that earns its strictness: ports are guessed constantly, the
 * number is short and unambiguous, and a wrong one produces a health check that never passes and a
 * deploy that hangs until it times out.
 */
export const checkPortAnchor = (port: number, evidenceText: string): AnchorOutcome =>
  new RegExp(`\\b${port}\\b`).test(evidenceText)
    ? { satisfied: true }
    : {
        satisfied: false,
        expectation: `the number ${port} to appear in the cited line`
      };

/**
 * A claimed command must appear in the file it was cited from.
 *
 * Compared loosely: quoting differs between a shell script, a JSON manifest and a Dockerfile, and
 * the distinctive part of a command is its head and its arguments rather than its punctuation.
 */
export const checkCommandAnchor = (command: string, fileContents: string): AnchorOutcome => {
  const normalizedFile = fileContents.replace(/\s+/g, ' ');
  const normalizedCommand = command.replace(/\s+/g, ' ').trim();
  if (normalizedFile.includes(normalizedCommand)) {
    return { satisfied: true };
  }

  // The Streamlit manifest probe derives the production invocation from a declared Streamlit app;
  // projects ordinarily contain the import and entry file, not this full CLI command verbatim.
  if (/^streamlit run \S+/.test(normalizedCommand) && /\bstreamlit\b/i.test(normalizedFile)) {
    return { satisfied: true };
  }

  // A manifest often names a script (`"build": "next build"`) that the claim reports as the runner
  // invocation (`npm run build`). Both are true; only one is written down. Falling back to the
  // significant words keeps that from reading as a fabrication.
  const words = normalizedCommand
    .split(' ')
    .filter((word) => word.length > 2 && !/^(npm|pnpm|yarn|bun|run|npx)$/.test(word));
  if (words.length > 0 && words.every((word) => normalizedFile.includes(word))) {
    return { satisfied: true };
  }

  return {
    satisfied: false,
    expectation: `"${command}" to appear in the cited file`
  };
};

/** Whether evidence supports the claim that a service serves HTTP. */
export const checkHttpAnchor = (evidenceText: string): AnchorOutcome =>
  anyMatch(HTTP_PATTERNS, evidenceText)
    ? { satisfied: true }
    : {
        satisfied: false,
        expectation: 'a server bind, route registration, web framework, or EXPOSE directive'
      };

export const checkContainerEntrypointAnchor = (
  entrypoint: string,
  fileContents: string,
  exposesHttp: boolean
): AnchorOutcome => {
  if (!exposesHttp) return { satisfied: true };
  if (
    checkHttpAnchor(fileContents).satisfied ||
    /@SpringBootApplication|SpringApplication\.run\s*\(/.test(fileContents) ||
    /@Path\s*\(/.test(fileContents) ||
    (entrypoint.toLowerCase().endsWith('index.php') && /<\?php/.test(fileContents))
  ) {
    return { satisfied: true };
  }
  return {
    satisfied: false,
    expectation: 'the entrypoint file itself to create or expose an HTTP application'
  };
};

/** Whether evidence contains the schedule expression it claims. */
export const checkScheduleAnchor = (schedule: string, evidenceText: string): AnchorOutcome => {
  const trimmed = schedule.trim();
  if (evidenceText.includes(trimmed)) {
    return { satisfied: true };
  }
  // Cron fields survive reformatting badly; requiring the distinctive ones is enough.
  const fields = trimmed.split(/\s+/).filter((field) => field !== '*');
  return fields.length > 0 && fields.every((field) => evidenceText.includes(field))
    ? { satisfied: true }
    : {
        satisfied: false,
        expectation: `the schedule "${schedule}" to appear in the cited line`
      };
};
