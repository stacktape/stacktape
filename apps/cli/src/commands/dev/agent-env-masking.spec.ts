import { describe, expect, test } from 'bun:test';
import { describeContainerExit, describeMaskedContainerExit } from './container/exit-reason';
import {
  createEnvironmentMasker,
  getSecretSourcedEnvNames,
  maskAgentEnvironment,
  maskEnvironmentValuesInText
} from './agent-env-masking';

describe('dev agent environment masking', () => {
  test.each([
    // Secret names
    ['DB_PASSWORD', 'hunter2', '[redacted]'],
    ['STRIPE_KEY', 'live-value', '[redacted]'],
    ['stripeKey', 'live-value', '[redacted]'],
    ['AWS_SECRET_ACCESS_KEY', 'abc/def', '[redacted]'],
    ['AWS_SESSION_TOKEN', 'IQoJb3JpZ2lu', '[redacted]'],
    ['AWS_ACCESS_KEY_ID', 'ASIAEXAMPLE', '[redacted]'],
    ['AUTHORIZATION_HEADER', 'Basic Zm9vOmJhcg==', '[redacted]'],
    ['GITHUB_CREDENTIALS', '{"user":"x"}', '[redacted]'],
    // Passwords inside connection strings; host, port and database stay readable.
    [
      'STP_DB_CONNECTION_STRING',
      'postgresql://postgres:2f9c1d@localhost:5432/app',
      'postgresql://[redacted:credentials]@localhost:5432/app'
    ],
    [
      'STP_DB_JDBC_CONNECTION_STRING',
      'jdbc:postgresql://localhost:5432/app?user=postgres&password=2f9c1d',
      'jdbc:postgresql://localhost:5432/app?user=postgres&password=[redacted]'
    ],
    ['REDIS_URL', 'redis://default:2f9c1d@127.0.0.1:6379', 'redis://[redacted:credentials]@127.0.0.1:6379'],
    // Known token formats under innocent names
    ['UPSTREAM', 'ghp_abcdefghijklmnopqrstuvwxyz0123', '[redacted:secret]'],
    // Plain settings developers need to see
    ['PORT', '3000', '3000'],
    ['STP_DB_HOST', 'localhost', 'localhost'],
    ['STP_API_URL', 'http://host.docker.internal:3001', 'http://host.docker.internal:3001'],
    ['AWS_REGION', 'eu-west-1', 'eu-west-1'],
    ['KEYCLOAK_URL', 'http://localhost:8080', 'http://localhost:8080'],
    ['MONKEY_COUNT', '3', '3'],
    // Private addresses, such as the dev box relaying a local database, stay readable; public ones are masked.
    ['STP_DB_HOST', '10.42.0.17', '10.42.0.17'],
    [
      'STP_DB_JDBC_CONNECTION_STRING',
      'jdbc:postgresql://10.42.0.17:40001/app?user=postgres&password=2f9c1d',
      'jdbc:postgresql://10.42.0.17:40001/app?user=postgres&password=[redacted]'
    ],
    ['UPSTREAM_HOSTS', '192.168.1.5,172.20.3.4,172.32.0.1', '192.168.1.5,172.20.3.4,[redacted:ip]'],
    ['PUBLIC_HOST', '52.31.4.200', '[redacted:ip]']
  ])('%s=%s is returned as %s', (name, value, expected) => {
    expect(maskAgentEnvironment({ [name]: value })[name]).toBe(expected);
  });

  test('a value read from a secret is masked even when its name and value look harmless', () => {
    const resource = {
      environment: [
        { name: 'PAYMENT_WEBHOOK', value: '$Secret(payments.webhook)' },
        { name: 'SIGNING_HOST', value: "$Format('{}.example.com', $SsmParam('/app/host'))" },
        { name: 'LOG_LEVEL', value: 'debug' }
      ],
      containers: [
        { environment: { WORKER_ENDPOINT: '$Secret(worker)' }, secrets: [{ name: 'API', valueFrom: 'arn' }] }
      ]
    };
    const secretNames = getSecretSourcedEnvNames(resource);
    expect([...secretNames].sort()).toEqual(['API', 'PAYMENT_WEBHOOK', 'SIGNING_HOST', 'WORKER_ENDPOINT']);
    expect(
      maskAgentEnvironment(
        { PAYMENT_WEBHOOK: 'whsec-plain', SIGNING_HOST: 'internal.example.com', LOG_LEVEL: 'debug' },
        secretNames
      )
    ).toEqual({ PAYMENT_WEBHOOK: '[redacted]', SIGNING_HOST: '[redacted]', LOG_LEVEL: 'debug' });
  });
});

// #382 review: a Rails startup that raised `ENV.inspect` quoted the database password in the rebuild summary, which
// reaches the workload status, MCP results and the log. The summary keeps one shortened exception line, and the values
// the container received are masked in it as `/env` masks them.
test('a crash summary that quotes an environment dump masks the secret values the container received', () => {
  const password = 'hunter2-db-password';
  const environment = {
    DATABASE_PASSWORD: password,
    DATABASE_URL: `postgresql://app:${password}@10.230.4.17:5432/app`,
    STRIPE_KEY: 'sk_live_51HxExampleSecretKey00',
    WEBHOOK: 'whsec-plain-webhook-value',
    RAILS_ENV: 'development',
    PORT: '3000',
    PATH: '/usr/local/bundle/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
  };
  const dump = `{${Object.entries(environment)
    .map(([name, value]) => `"${name}" => "${value}"`)
    .join(', ')}}`;
  const stderr = [
    'bin/rails aborted!',
    dump,
    "/app/config/application.rb:6:in '<top (required)>'",
    "/usr/local/bundle/gems/railties-8.0.5.1/lib/rails/command.rb:150:in 'Rails::Command.invoke_rake'",
    '(See full trace by running task with --trace)'
  ].join('\n');
  const summary = maskEnvironmentValuesInText(describeContainerExit(stderr)!, environment, new Set(['WEBHOOK']));
  for (const secret of ['hunter2-db-password', 'sk_live_51HxExampleSecretKey00', 'whsec-plain-webhook-value']) {
    expect(summary).not.toContain(secret);
  }
  expect(summary).toContain('"RAILS_ENV" => "development"');
  expect(summary.split('\n')).toEqual([
    'bin/rails aborted!',
    expect.stringMatching(/^\{"DATABASE_PASSWORD" .{200,300}\.\.\.$/),
    "/app/config/application.rb:6:in '<top (required)>'"
  ]);
  // Short values such as ports also appear as line numbers; they stay as they are.
  expect(maskEnvironmentValuesInText('main.rb:3000', { API_TOKEN_TTL: '3000' })).toBe('main.rb:3000');
});

// #386 review: a five-character secret appeared unmasked in a frontend's failure summary.
test('a secret-sourced value is masked in a summary whatever its length; short plain values stay', () => {
  const environment = { PIN: 'k9#Qz', CODE: 'ct', PORT: '3000' };
  expect(
    maskEnvironmentValuesInText(
      'Failed to configure webhook: k9#Qz (code ct), port 3000',
      environment,
      new Set(['PIN', 'CODE'])
    )
  ).toBe('Failed to configure webhook: [redacted] (code [redacted]), port 3000');
});

// #386 re-review: the summary trimmed the trailing newline of a multi-line secret before masking, so it never matched.
test('a container crash summary masks a multi-line secret that ends with a newline, line by line', () => {
  const key = '== signing material ==\nr2tt-first-secret-line-4f8a\nk3yL1n3TwoSecretTail\n==\n';
  const environment = { SIGNING_KEY: key, PORT: '3000' };
  const stderr = [
    'Traceback (most recent call last):',
    '  File "/app/main.py", line 4, in <module>',
    `    raise ValueError(os.environ["SIGNING_KEY"])`,
    `ValueError: bad key ${key}`
  ].join('\n');
  const summary = describeMaskedContainerExit(stderr, createEnvironmentMasker(environment, new Set(['SIGNING_KEY'])));
  expect(summary).toBeDefined();
  for (const line of ['r2tt-first-secret-line-4f8a', 'k3yL1n3TwoSecretTail']) expect(summary).not.toContain(line);
  // Each line of the value alone, as a summary that keeps some lines would quote it.
  const mask = createEnvironmentMasker(environment, new Set(['SIGNING_KEY']));
  expect(mask('last line: k3yL1n3TwoSecretTail')).toBe('last line: [redacted]');
  expect(mask(key.trimEnd())).not.toContain('r2tt-first-secret-line');
});
