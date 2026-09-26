import assert from 'node:assert/strict';
import test from 'node:test';
import { containsSensitiveText, scrubSensitiveText } from './sensitive-text.js';

// Credential-shaped fixtures are assembled at runtime so no committed line has the shape of a real secret.
const fake = {
  awsKey: `${'AKIA'}${'0'.repeat(16)}`,
  githubToken: `${'ghp_'}${'a'.repeat(36)}`,
  stripeKey: `${'sk_live_'}${'b'.repeat(24)}`,
  slackToken: `${'xoxb-'}${'1234567890-abcdefghijk'}`,
  stacktapeKey: 'stp_live_fakeid_fakesecret',
  anthropicKey: ['sk', 'ant', 'api03', `${'Fake0key_'.repeat(10)}AA`].join('-'),
  anthropicOAuthToken: ['sk', 'ant', 'oat01', `${'fake-token_'.repeat(8)}AA`].join('-'),
  jwt: ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxMjM0In0', 'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'].join('.'),
  connectionString: `postgres:/${'/app:not-a-real-password@db.example.com:5432/orders'}`,
  pem: (body: string) => {
    const label = 'RSA PRIVATE KEY';
    return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
  }
};

test('masks credential formats that are recognizable on their own', () => {
  const cases: Array<[string, string]> = [
    [`aws key ${fake.awsKey} leaked`, 'aws key [redacted:secret] leaked'],
    [fake.githubToken, '[redacted:secret]'],
    [`Stripe ${fake.stripeKey} failed`, 'Stripe [redacted:secret] failed'],
    [`slack ${fake.slackToken}`, 'slack [redacted:secret]'],
    [`key ${fake.stacktapeKey}`, 'key [redacted:secret]'],
    [`Anthropic rejected ${fake.anthropicKey}: 401`, 'Anthropic rejected [redacted:secret]: 401'],
    [`oauth ${fake.anthropicOAuthToken}`, 'oauth [redacted:secret]'],
    [`jwt ${fake.jwt}`, 'jwt [redacted:secret]'],
    ['Authorization: Bearer abcdef.ghijkl.mnopqr', 'Authorization: Bearer [redacted:secret]'],
    [fake.connectionString, 'postgres://[redacted:credentials]@db.example.com:5432/orders']
  ];
  for (const [input, expected] of cases) assert.equal(scrubSensitiveText(input), expected, input);
  assert.equal(scrubSensitiveText(`${fake.pem('MIIEow\nIBAAKCAQEA')} then`), '[redacted:private-key] then');
});

test('masks values under sensitive key names in text, query strings and JSON', () => {
  assert.equal(
    scrubSensitiveText('DB_PASSWORD=not-a-real-password DB_HOST=db.example.com'),
    'DB_PASSWORD=[redacted] DB_HOST=db.example.com'
  );
  assert.equal(scrubSensitiveText('GET /login?token=abc123&page=2'), 'GET /login?token=[redacted]&page=2');
  assert.equal(
    scrubSensitiveText('{"user":"ana","apiKey":"k-123","x-api-key": "k-456", "count": 3}'),
    '{"user":"ana","apiKey":[redacted],"x-api-key": [redacted], "count": 3}'
  );
  assert.equal(scrubSensitiveText('cookie: session_id=9f8e7d; theme=dark'), 'cookie: [redacted]; theme=dark');
  assert.equal(scrubSensitiveText('author=Ana Author'), 'author=Ana Author', 'author is not an authorization key');
});

test('masks personal identifiers while keeping the shape a developer can still recognize', () => {
  assert.equal(
    scrubSensitiveText('user ana.novak@example.com not found'),
    'user [redacted:email]@example.com not found'
  );
  assert.equal(scrubSensitiveText('client 203.0.113.42 timed out'), 'client [redacted:ip] timed out');
  assert.equal(scrubSensitiveText('peer 2001:0db8:85a3:0000:0000:8a2e:0370:7334 closed'), 'peer [redacted:ip] closed');
  assert.equal(scrubSensitiveText('card 4242 4242 4242 4242 declined'), 'card [redacted:card] declined');
  assert.equal(
    scrubSensitiveText('at handler (/Users/ana/dev/app/src/index.ts:4:3) and C:\\Users\\ana\\app\\index.js'),
    'at handler (/Users/[user]/dev/app/src/index.ts:4:3) and C:\\Users\\[user]\\app\\index.js'
  );
});

test('leaves the numbers and names that error messages are made of alone', () => {
  const untouched = [
    'TypeError: Cannot read properties of undefined (reading "id") at /var/task/index.js:42:17',
    'order 8412345678901 not found after 12034 ms on port 5432 (v10.20.30.40 is not an address)',
    'RequestId: 3f9c2d4e-7b1a-4c2d-9e8f-1234567890ab took 1758066032123 ms',
    'user@ prompt shows the shell, version 1.2.3 released 2026-09-17T05:48:28+02:00',
    'expected 1234567890123456 items'
  ];
  for (const text of untouched) assert.equal(scrubSensitiveText(text), text, text);
  assert.equal(containsSensitiveText('nothing here'), false);
  assert.equal(containsSensitiveText('mail ana@example.com'), true);
});

test('reaches secrets inside serialized JSON, lists and short or scheme-prefixed credentials', () => {
  assert.equal(
    scrubSensitiveText(
      'Invoke Error {"errorMessage":"{\\"password\\":\\"synthetic-password\\",\\"user\\":\\"ana\\"}"}'
    ),
    'Invoke Error {"errorMessage":"{\\"password\\":[redacted],\\"user\\":\\"ana\\"}"}'
  );
  assert.equal(
    scrubSensitiveText('{"tokens":["first-synthetic","second-synthetic"],"count":2}'),
    '{"tokens":[redacted],"count":2}'
  );
  assert.equal(scrubSensitiveText('Authorization: Basic dTpw'), 'Authorization: Basic [redacted:secret]');
  assert.equal(scrubSensitiveText('password=Basic!fake-password'), 'password=[redacted]');
  assert.equal(scrubSensitiveText('ENOENT "/home/alice" not found'), 'ENOENT "/home/[user]" not found');
  assert.equal(scrubSensitiveText('ENOENT C:\\Users\\Alice not found'), 'ENOENT C:\\Users\\[user] not found');
});

test('stays fast on long runs of key-like characters', () => {
  const long = `${'a'.repeat(40_000)} password=x`;
  const started = performance.now();
  assert.equal(scrubSensitiveText(long), `${'a'.repeat(40_000)} password=[redacted]`);
  assert.ok(performance.now() - started < 500, 'a 40k-character line must scrub in well under a second');
});

test('leaves error names, code and prose that merely contain a sensitive word alone', () => {
  const untouched = [
    'TokenExpiredError: jwt expired',
    'CredentialsProviderError: Could not load credentials from any providers',
    'ExpiredTokenException: The security token included in the request is expired',
    'not authorized to perform: secretsmanager:GetSecretValue on resource: arn:aws:secretsmanager:eu-west-1:000000000000:secret:app/db-Ab12Cd',
    '    at verify (/var/task/src/auth/token.ts:42:7)',
    'Error: token validation failed',
    'Bearer token is missing from the request',
    'Basic authentication required. Token expired.',
    'TOKEN_ERROR=5',
    'Anthropic keys start with sk-ant- followed by their type',
    'mask-ant-colony-simulation-worker-3 crashed'
  ];
  for (const text of untouched) assert.equal(scrubSensitiveText(text), text, text);
});

test('masks a value after a colon only when a space or a quote follows the colon', () => {
  assert.equal(scrubSensitiveText('{"password":"synthetic-value"}'), '{"password":[redacted]}');
  assert.equal(scrubSensitiveText('password: synthetic-value'), 'password: [redacted]');
  assert.equal(scrubSensitiveText('DB_PASSWORD = synthetic-value'), 'DB_PASSWORD = [redacted]');
  assert.equal(scrubSensitiveText('Authorization: Bearer abc.def.ghi'), 'Authorization: Bearer [redacted:secret]');
  assert.equal(scrubSensitiveText('token 9f8e7d6c5b4a'), 'token [redacted:secret]');
  // A colon glued to the next character is code, not a key/value pair; this is a deliberate limit of the rule.
  assert.equal(scrubSensitiveText('password:synthetic-value'), 'password:synthetic-value');
});

/** The Luhn checksum the scrubber applies, used to build long numbers that pass it but are not card numbers. */
const luhnValid = (digits: string) =>
  [...digits].reduce((sum, char, index) => {
    const fromRight = digits.length - 1 - index;
    const doubled = fromRight % 2 === 1 ? Number(char) * 2 : Number(char);
    return sum + (doubled > 9 ? doubled - 9 : doubled);
  }, 0) %
    10 ===
  0;
const withCheckDigit = (body: string) => [...'0123456789'].map((d) => `${body}${d}`).find(luhnValid) as string;

test('masks card numbers of known networks and leaves other long numbers alone', () => {
  assert.equal(scrubSensitiveText('card 4242 4242 4242 4242 declined'), 'card [redacted:card] declined');
  assert.equal(scrubSensitiveText('card 5500-0000-0000-0004 declined'), 'card [redacted:card] declined');
  const timestamp = withCheckDigit('175809123456');
  const orderId = withCheckDigit('98765432109876');
  assert.ok(luhnValid(timestamp) && luhnValid(orderId));
  assert.equal(scrubSensitiveText(`order ${orderId} at ${timestamp}`), `order ${orderId} at ${timestamp}`);
});
