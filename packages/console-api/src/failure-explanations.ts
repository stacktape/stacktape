/**
 * Plain-language explanations of the deploy failures developers meet most: raw AWS, CloudFormation, container and Git
 * text, matched where it appears in a failure message. Every surface that shows a failure (the CLI's hints, the init
 * wizard, the Console's deployment pages) asks this module, so each explanation is written once. The original text is
 * always kept next to the explanation; a message no rule recognizes is shown unchanged.
 *
 * Rules match text that has already been through `scrubSensitiveText`, which masks IP addresses other than loopback, so
 * a rule never depends on a masked value.
 */

export type FailureExplanation = {
  /** Stable rule id, for tests and analytics. */
  id: string;
  /** What went wrong, in the developer's terms. */
  cause: string;
  /** What to do next. Inline code is written in backticks. */
  action: string;
  /** Where to read more or fix it: a documentation page, an AWS console page, or a Console path starting with `/`. */
  link?: { label: string; url: string };
};

export type FailureRule = {
  id: string;
  match: RegExp;
  /** Shown only when no other rule matched, for a wrapper that says little on its own. */
  fallback?: boolean;
  explain: (match: RegExpExecArray, text: string) => Omit<FailureExplanation, 'id'>;
};

const DOCS = 'https://docs.stacktape.com';
const SERVICE_QUOTAS = { label: 'AWS Service Quotas', url: 'https://console.aws.amazon.com/servicequotas/home' };

const SERVICE_BY_PORT: Record<string, string> = {
  '5432': 'PostgreSQL',
  '3306': 'MySQL',
  '6379': 'Redis',
  '27017': 'MongoDB',
  '9200': 'OpenSearch',
  '5672': 'RabbitMQ',
  '11211': 'Memcached'
};

/**
 * The resource a CloudFormation failure line names, as the developer wrote it: the CLI prints `1. ApiLambda (in api)`
 * or `Resource ApiLambda (part of api): reason`. Without the Stacktape name there is only a logical ID, which does not
 * match the config, so nothing is returned.
 */
const configResourceBefore = (text: string, index: number) => {
  const before = text.slice(0, index);
  // Only the failure item the match belongs to: an earlier item can name a different resource.
  const itemStart = Math.max(0, ...[...before.matchAll(/(?:^|\n)\s*\d+\.\s|Resource \S+/g)].map((item) => item.index));
  return /\((?:in|part of) ([A-Za-z0-9_.-]+)\)/.exec(before.slice(itemStart))?.[1];
};

const connectAction = (port: string) =>
  SERVICE_BY_PORT[port]
    ? "Point the app at a real database: add one to your config as a resource and list it in this service's `connectTo`, then read its address from the environment variable Stacktape sets (for a resource named `myDatabase`, `STP_MY_DATABASE_CONNECTION_STRING`). For a database you already run elsewhere, put its address in the app's environment, for example from a secret."
    : "Add what the app needs as a resource, list it in this service's `connectTo`, and read its address from the environment variables Stacktape sets instead of `localhost`.";

const CONNECTING_RESOURCES = {
  label: 'Connecting resources',
  url: `${DOCS}/configuration/connecting-resources#environment-variable-naming`
};

export const FAILURE_RULES: FailureRule[] = [
  {
    id: 'lambda-package-too-large',
    match: /Unzipped size must be smaller than \d+ bytes|combined with layers exceeds the maximum allowed size/i,
    explain: (match, text) => {
      const name = configResourceBefore(text, match.index);
      return {
        cause: `${name ? `Function \`${name}\`` : 'A function'} is larger than 250 MB unzipped (its code and layers together), the most AWS Lambda accepts.`,
        action:
          'Leave out files and dependencies the function does not need at runtime with `excludeFiles` and `excludeDependencies`. If it still does not fit, run this code as a web service or another container resource; container images can be much larger.',
        link: {
          label: 'Lambda package size',
          url: `${DOCS}/packaging/function/js-bundle#what-is-the-maximum-lambda-deployment-package-size`
        }
      };
    }
  },
  {
    id: 'connection-refused-localhost',
    match:
      /ECONNREFUSED ((?:::ffff:)?127\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|::1|0\.0\.0\.0):(\d+)|"(localhost)" \(127\.0\.0\.1\), port (\d+) failed: Connection refused/,
    explain: (match) => {
      const host = match[1] ?? match[3]!;
      const port = match[2] ?? match[4]!;
      const service = SERVICE_BY_PORT[port];
      return {
        cause: `The app tried to reach ${service ?? 'a service'} at ${host}:${port}, which is the app's own container. Nothing runs there on AWS, so the app stopped.`,
        action: connectAction(port),
        link: CONNECTING_RESOURCES
      };
    }
  },
  {
    id: 'host-not-found',
    match: /getaddrinfo ENOTFOUND ([A-Za-z0-9_.-]+)/,
    explain: (match) => ({
      cause: `The app looked up the host \`${match[1]}\`, which does not exist on AWS. It is often a name from a local setup, such as a Docker Compose service.`,
      action:
        "Read the address from the environment variable Stacktape sets for a resource listed in the service's `connectTo`, instead of a fixed host name.",
      link: CONNECTING_RESOURCES
    })
  },
  {
    id: 'connection-refused',
    match: /ECONNREFUSED (?!localhost|127\.|::ffff:127\.|::1:|0\.0\.0\.0)(\S+):(\d+)\b/,
    explain: (match) => ({
      cause: `The app could not connect to ${SERVICE_BY_PORT[match[2]!] ?? 'a service'} at port ${match[2]}: nothing accepted the connection.`,
      action:
        "Check that the address the app uses is right and that the database or service is running. Listing the resource in the service's `connectTo` also opens the network path to it.",
      link: CONNECTING_RESOURCES
    })
  },
  {
    id: 'container-out-of-memory',
    match: /OutOfMemoryError: Container killed due to memory usage/,
    explain: () => ({
      cause: 'The container used more memory than it is allowed, so AWS stopped it.',
      action: 'Raise `resources.memory` for this service, or find what uses the memory when the app starts.',
      link: { label: 'Compute resources', url: `${DOCS}/resources/compute/web-service#compute-resources` }
    })
  },
  {
    id: 'health-check-failed',
    match: /failed ELB health checks/i,
    explain: () => ({
      cause:
        "The app started, but the load balancer's health check never got an answer, so AWS replaced the container until the deploy gave up.",
      action:
        'Make the app listen on the `PORT` environment variable (3000 by default), or set `port` to the port it uses. The health check path (`/` unless you set `healthcheckPath`) must answer with status 200.',
      link: { label: 'Port', url: `${DOCS}/resources/compute/web-service#port` }
    })
  },
  {
    id: 'container-health-check-failed',
    match: /failed container health checks/i,
    explain: () => ({
      cause:
        "The container's own health check command kept failing, so AWS replaced the container until the deploy gave up.",
      action:
        'Check the command in `internalHealthCheck`: it must exit with 0 once the app is ready. If the app needs longer to start, raise `startPeriodSeconds`.',
      link: { label: 'Health checks', url: `${DOCS}/resources/compute/web-service#health-checks` }
    })
  },
  {
    id: 'exec-format-error',
    match: /exec format error/i,
    explain: () => ({
      cause:
        'The container could not start its program because the file is not in a format this machine can run. Usually the image was built for a different processor type (ARM or x86); a script without a `#!` line causes it too.',
      action:
        'Build the image for the architecture the service uses (`x86_64` unless `resources.architecture` is `arm64`), or set `resources.architecture` to match the image. If the entry point is a script, start it with a line such as `#!/bin/sh`.',
      link: { label: 'Compute resources', url: `${DOCS}/resources/compute/web-service#compute-resources` }
    })
  },
  {
    id: 'module-not-found',
    match: /Cannot find (?:module|package) '([^']+)'|ModuleNotFoundError: No module named '([^']+)'/,
    explain: (match) => {
      const python = match[2];
      const name = match[1] ?? python!;
      if (!python && /^[./]/.test(name)) {
        return {
          cause: `The app's start command points to \`${name}\`, which is not in the deployed package.`,
          action:
            'Check the entry file or start command in your config, and that the build step that creates this file runs before the app is packaged.'
        };
      }
      return {
        cause: `The app could not load \`${name}\` when it started, because it is not in the deployed package.`,
        action: python
          ? `Add \`${name}\` to your requirements.txt or pyproject.toml.`
          : `List \`${name}\` under \`dependencies\` (not \`devDependencies\`) in package.json, and check that \`excludeDependencies\` does not leave it out.`
      };
    }
  },
  {
    id: 'aws-credentials-expired',
    match:
      /security token included in the request is (?:expired|invalid)|ExpiredToken|The provided token has expired|InvalidClientTokenId|Token has expired and refresh failed/i,
    explain: () => ({
      cause: 'The AWS credentials used for this deploy have expired or are not valid.',
      action: 'Sign in to AWS again (for example `aws sso login`) or replace the access keys, then deploy again.'
    })
  },
  {
    id: 'aws-access-denied',
    match: /(?:arn:aws[\w-]*:(?:iam|sts)::\d*:\S+?) is not authorized to perform: ([\w-]+:[\w*]+)/,
    explain: (match, text) => {
      const action = match[1]!;
      const identity = /arn:aws[\w-]*:(?:iam|sts)::\d*:(\S+?) is not authorized/.exec(text)?.[1];
      const blockedByOrganization =
        /service control policy|explicit deny in a (?:service control|resource control) policy/i.test(text);
      return {
        cause: `The AWS identity this deploy used${identity ? ` (\`${identity}\`)` : ''} is not allowed to run \`${action}\`.`,
        action: blockedByOrganization
          ? "A policy of your AWS organization blocks it, so only your AWS organization's administrator can allow it."
          : `Deploy with credentials that have administrator access in this AWS account, or ask its administrator to allow \`${action}\`.`
      };
    }
  },
  {
    id: 'lambda-reserved-concurrency',
    match: /UnreservedConcurrentExecution below its minimum value/,
    explain: () => ({
      cause:
        'A function reserves concurrency, but the AWS account does not have enough left to reserve. New AWS accounts often start with a limit of 10.',
      action:
        'Remove `reservedConcurrency` from the function, or ask AWS to raise the Lambda concurrent executions quota.',
      link: SERVICE_QUOTAS
    })
  },
  {
    id: 'aws-quota',
    match:
      /The maximum number of ([^.]+?) has been reached|You have requested more vCPU capacity than your current vCPU limit|LimitExceeded/,
    explain: (match) => ({
      cause: `The AWS account reached its limit (quota) for ${match[1] ?? 'this kind of resource'}.`,
      action:
        'Remove ones you no longer use, or ask AWS for a higher limit in Service Quotas; most requests are approved within a day.',
      link: SERVICE_QUOTAS
    })
  },
  {
    id: 'resource-already-exists',
    match:
      /with identifier '([^']+)' already exists|(\S+) already exists in stack|BucketAlreadyExists|requested bucket name is not available/,
    explain: (match) => {
      const name = match[1] ?? match[2];
      if (match[2]) {
        return {
          cause: `\`${name}\` already belongs to another CloudFormation stack in this account and region.`,
          action: 'Delete that stack or rename this resource in your config, then deploy again.'
        };
      }
      if (!name) {
        return {
          cause: 'The S3 bucket name is already taken. Bucket names are shared by every AWS account, worldwide.',
          action: 'Choose a different bucket name, or remove the fixed name so Stacktape generates one.'
        };
      }
      return {
        cause: `AWS already has a resource \`${name}\` that this deploy did not create. It is often left over from an earlier stack that was deleted but kept its data.`,
        action:
          'If you no longer need it, delete it in the AWS console and deploy again. Otherwise rename the resource in your config.'
      };
    }
  },
  {
    id: 'lambda-runtime-deprecated',
    match: /The runtime parameter of (\S+) is no longer supported/,
    explain: (match) => ({
      cause: `AWS no longer accepts the \`${match[1]}\` runtime for new or updated functions.`,
      action: "Set the function's `runtime` to a supported version, such as `nodejs22.x` or `python3.13`.",
      link: { label: 'Lambda functions', url: `${DOCS}/resources/compute/lambda-function` }
    })
  },
  {
    id: 'docker-hub-rate-limit',
    match: /toomanyrequests: You have reached your pull rate limit/,
    explain: () => ({
      cause: 'Docker Hub refused to download an image because of its limit on anonymous downloads.',
      action:
        'Wait a few hours, or sign in with `docker login` on the machine that builds the image. Base images are also on Amazon ECR Public (`public.ecr.aws/docker/library/<image>`), which has no such limit for AWS builds.'
    })
  },
  {
    id: 'git-commit-missing',
    match: /reference is not a tree|fatal: invalid reference|not our ref|unable to read tree/,
    explain: () => ({
      cause:
        'The commit this deploy was for is no longer in the repository, for example because the branch was force-pushed or deleted.',
      action: "Push again; the next push deploys the branch's current commit."
    })
  },
  {
    id: 'git-repository-access',
    match:
      /could not access the repository|Repository not found|could not read Username for|fatal: Authentication failed for|fatal: unable to access '[^']+': The requested URL returned error: 40[134]|Write access to repository not granted/,
    explain: () => ({
      cause: 'Stacktape could not read the repository from your Git provider, so the deploy did not start.',
      action:
        'In Git connections, check that the connection is active and can read this repository. On GitHub, the Stacktape GitHub App must be given access to it.',
      link: { label: 'Git connections', url: '/git-integrations' }
    })
  }
];

/**
 * The explanations for a failure message, most specific first, one per rule. Empty when no rule matches, in which case
 * the caller shows the original text alone. `rules` lets a caller add explanations for failures only it produces.
 */
export const explainFailure = (text: string, rules: readonly FailureRule[] = FAILURE_RULES): FailureExplanation[] => {
  if (!text) return [];
  const found: FailureExplanation[] = [];
  const fallbacks: FailureExplanation[] = [];
  for (const rule of rules) {
    const match = rule.match.exec(text);
    if (!match) continue;
    (rule.fallback ? fallbacks : found).push({ id: rule.id, ...rule.explain(match, text) });
  }
  return found.length ? found : fallbacks;
};

/** An explanation as one line of plain text, for a terminal or a log: cause, next step and link. */
export const failureExplanationText = (
  { cause, action, link }: FailureExplanation,
  consoleUrl = 'https://console.stacktape.com'
): string =>
  `${cause} ${action}${link ? ` ${link.label}: ${link.url.startsWith('/') ? `${consoleUrl}${link.url}` : link.url}` : ''}`;
