import { describe, expect, test } from 'bun:test';
import { getSecretSourcedEnvNames, maskAgentEnvironment } from './agent-env-masking';

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
