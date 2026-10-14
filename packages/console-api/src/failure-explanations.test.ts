import assert from 'node:assert/strict';
import test from 'node:test';
import { explainFailure, FAILURE_RULES, failureExplanationText } from './failure-explanations.js';
import { scrubSensitiveText } from './sensitive-text.js';

// Failure texts as the CLI, older CLIs, AWS and containers produce them, with the rule each one should reach and a
// phrase its explanation must contain.
const cases: Array<[text: string, ruleIds: string[], phrase?: string]> = [
  [
    'Stack action update failed.\n\n1. ApiLambda (in api)\n   Unzipped size must be smaller than 262144000 bytes',
    ['lambda-package-too-large'],
    'Function `api` is larger than 250 MB'
  ],
  [
    'Stack action update failed.\n\n  1. ApiLambda\n     Unzipped size must be smaller than 262144000 bytes',
    ['lambda-package-too-large'],
    'A function is larger than 250 MB'
  ],
  [
    'Stack action create failed.\n\n1. WebEcsService (in web)\n   Service web failed to start\n\n   Exited with code 1 (Essential container in task exited)\n\n   Last logs before exit:\n     12:00:01 Error: connect ECONNREFUSED 127.0.0.1:5432\n     12:00:01     at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1611:16)',
    ['connection-refused-localhost'],
    'PostgreSQL at 127.0.0.1:5432'
  ],
  [
    'connection to server at "localhost" (127.0.0.1), port 5432 failed: Connection refused',
    ['connection-refused-localhost'],
    'PostgreSQL at localhost:5432'
  ],
  ['Error: connect ECONNREFUSED [redacted:ip]:6379', ['connection-refused'], 'Redis at port 6379'],
  ['Error: getaddrinfo ENOTFOUND postgres', ['host-not-found'], 'the host `postgres`'],
  ['Exited with code 137 (OutOfMemoryError: Container killed due to memory usage)', ['container-out-of-memory']],
  [
    'Service web failed to start: (service app-web) (task 1f2e) failed ELB health checks in (target-group arn:aws:elasticloadbalancing:eu-west-1:123456789012:targetgroup/app/1)',
    ['health-check-failed']
  ],
  ['exec /usr/local/bin/docker-entrypoint.sh: exec format error', ['exec-format-error']],
  ["Error: Cannot find module 'express'", ['module-not-found'], '`dependencies` (not `devDependencies`)'],
  ["Error: Cannot find module '/app/dist/server.js'", ['module-not-found'], 'start command points to'],
  ["ModuleNotFoundError: No module named 'fastapi'", ['module-not-found'], 'requirements.txt'],
  ['The security token included in the request is expired', ['aws-credentials-expired']],
  [
    'User: arn:aws:iam::123456789012:user/ci-deployer is not authorized to perform: iam:CreateRole on resource: arn:aws:iam::123456789012:role/app-role because no identity-based policy allows the iam:CreateRole action',
    ['aws-access-denied'],
    'identity this deploy used (`user/ci-deployer`) is not allowed to run `iam:CreateRole`'
  ],
  [
    'User: arn:aws:sts::123456789012:assumed-role/Deployer/session is not authorized to perform: ec2:CreateVpc with an explicit deny in a service control policy',
    ['aws-access-denied'],
    "AWS organization's administrator"
  ],
  [
    "Resource ApiLambda (part of api): Specified ReservedConcurrentExecutions for function decreases account's UnreservedConcurrentExecution below its minimum value of [10].",
    ['lambda-reserved-concurrency']
  ],
  ['Resource Vpc: The maximum number of VPCs has been reached.', ['aws-quota'], 'limit (quota) for VPCs'],
  [
    "Resource of type 'AWS::Logs::LogGroup' with identifier '/aws/lambda/app-production-api' already exists.",
    ['resource-already-exists'],
    '`/aws/lambda/app-production-api`'
  ],
  [
    'app-production-uploads already exists in stack arn:aws:cloudformation:eu-west-1:123456789012:stack/old/1',
    ['resource-already-exists'],
    'another CloudFormation stack'
  ],
  [
    'The runtime parameter of nodejs16.x is no longer supported for creating or updating AWS Lambda functions.',
    ['lambda-runtime-deprecated'],
    '`nodejs16.x`'
  ],
  [
    'ERROR: toomanyrequests: You have reached your pull rate limit. You may increase the limit by authenticating.',
    ['docker-hub-rate-limit']
  ],
  [
    "Creating git mirror...\nremote: Repository not found.\nfatal: repository 'https://github.com/acme/app.git/' not found",
    ['git-repository-access']
  ],
  ['fatal: reference is not a tree: 4b5c6d7e8f9012345a6b7c8d9e0f1a2b3c4d5e6f', ['git-commit-missing']],
  [
    'Error: connect ECONNREFUSED ::ffff:127.0.0.1:5432',
    ['connection-refused-localhost'],
    'PostgreSQL at ::ffff:127.0.0.1:5432'
  ],
  ['Error: connect ECONNREFUSED 2001:db8::5:6379', ['connection-refused'], 'Redis at port 6379'],
  [
    'Stack action update failed.\n\n1. Role (in worker)\n   Access denied for role\n\n2. LegacyLambda\n   Unzipped size must be smaller than 262144000 bytes',
    ['lambda-package-too-large'],
    'A function is larger than 250 MB'
  ],
  ['Task failed container health checks', ['container-health-check-failed'], '`internalHealthCheck`'],
  [
    "fatal: unable to access 'https://github.com/acme/app.git/': The requested URL returned error: 403",
    ['git-repository-access']
  ],
  // A temporary DNS failure, a forced stop and an unrelated download error are not the causes the rules describe.
  ['Error: getaddrinfo EAI_AGAIN db.example.com', []],
  ['Exited with code 137 (Essential container in task exited)', []],
  ['curl: (22) The requested URL returned error: 403', []],
  // Unknown failures stay unexplained, so the original text is shown alone.
  ["TypeError: Cannot read properties of undefined (reading 'currency')", []],
  ['Invalid configuration.', []],
  ['', []]
];

test('explains the common deploy failures and leaves unknown ones alone', () => {
  for (const [text, ruleIds, phrase] of cases) {
    const explanations = explainFailure(text);
    assert.deepEqual(
      explanations.map(({ id }) => id),
      ruleIds,
      text
    );
    if (phrase)
      assert.ok(failureExplanationText(explanations[0]!).includes(phrase), `${text}\n→ ${explanations[0]?.cause}`);
  }
});

test('explanations survive the scrub the Console applies before storing a failure', () => {
  const stored = scrubSensitiveText('Error: connect ECONNREFUSED 127.0.0.1:5432');
  assert.deepEqual(
    explainFailure(stored).map(({ id }) => id),
    ['connection-refused-localhost']
  );
});

test('a caller adds rules for failures only it produces; a fallback shows only when nothing else matched', () => {
  const rules = [
    {
      id: 'wrapper',
      match: /^SSM command Failed/,
      fallback: true,
      explain: () => ({ cause: 'The runner stopped.', action: 'Read its output.' })
    }
  ];
  assert.deepEqual(
    explainFailure('SSM command Failed: Failed\n\nnpm ERR! code E404', rules).map(({ id }) => id),
    ['wrapper']
  );
  assert.deepEqual(
    explainFailure('SSM command Failed: Failed\n\nremote: Repository not found.', [
      ...rules,
      ...FAILURE_RULES.filter((rule) => rule.id === 'git-repository-access')
    ]).map(({ id }) => id),
    ['git-repository-access']
  );
});

test('a link to a Console page becomes a full address in plain text', () => {
  const [explanation] = explainFailure('remote: Repository not found.');
  assert.ok(
    failureExplanationText(explanation!).endsWith('Git connections: https://console.stacktape.com/git-integrations')
  );
});
