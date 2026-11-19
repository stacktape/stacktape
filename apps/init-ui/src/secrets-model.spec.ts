import { describe, expect, it } from 'bun:test';
import type { WizardState } from './session';
import { canGenerateSecret, firstSentence, generateSecretValue, planSecrets } from './secrets-model';

describe('which secrets the page may generate', () => {
  it.each([
    // Values the app owns.
    ['AUTH_SECRET', true],
    ['SESSION_SECRET', true],
    ['NEXTAUTH_SECRET', true],
    ['BETTER_AUTH_SECRET', true],
    ['JWT_SECRET', true],
    ['SECRET_KEY', true],
    ['SECRET_KEY_BASE', true],
    ['APP_KEY', true],
    ['ENCRYPTION_KEY', true],
    ['HONEYPOT_SECRET', true],
    ['INTERNAL_COMMAND_TOKEN', true],
    ['FIRST_SUPERUSER_PASSWORD', true],
    // Credentials another service issues.
    ['STRIPE_SECRET_KEY', false],
    ['STRIPE_WEBHOOK_SECRET', false],
    ['GITHUB_CLIENT_SECRET', false],
    ['GITHUB_TOKEN', false],
    ['RESEND_API_KEY', false],
    ['SENTRY_DSN', false],
    ['SMTP_PASSWORD', false],
    ['AWS_SECRET_ACCESS_KEY', false],
    ['OPENAI_API_KEY', false],
    ['DATABASE_PASSWORD', false],
    ['WEBHOOK_SECRET', false],
    ['CLIENT_SECRET', false],
    // Not keys at all.
    ['RMQ_URL', false],
    ['FIRST_SUPERUSER', false],
    ['SMTP_USER', false],
    ['API_TOKEN', false],
    ['LICENSE_KEY', false]
  ])('%s → %p', (variable, expected) => {
    expect(canGenerateSecret(variable)).toBe(expected);
  });
});

const counting = (bytes: Uint8Array) => bytes.map((_, index) => index * 7);

describe('generated values', () => {
  it('are 32 bytes of hex by default', () => {
    expect(generateSecretValue('AUTH_SECRET')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('take the shape the framework expects', () => {
    expect(generateSecretValue('APP_KEY', counting)).toMatch(/^base64:[A-Za-z0-9+/]{43}=$/);
    expect(generateSecretValue('SECRET_KEY_BASE')).toMatch(/^[0-9a-f]{128}$/);
    // A password someone may type, within what sign-up forms accept.
    expect(generateSecretValue('FIRST_SUPERUSER_PASSWORD')).toMatch(/^[A-HJ-NP-Za-km-z2-9]{24}$/);
  });

  it('differ every time', () => {
    expect(generateSecretValue('SESSION_SECRET')).not.toBe(generateSecretValue('SESSION_SECRET'));
  });
});

describe('firstSentence', () => {
  it.each([
    [
      'Your app needs a RabbitMQ broker, which Stacktape does not create. Use a hosted one.',
      'Your app needs a RabbitMQ broker, which Stacktape does not create.'
    ],
    [
      'compose.yml: init did not carry `external` of `networks.traefik-public`.',
      'compose.yml: init did not carry `external` of `networks.traefik-public`.'
    ],
    ['No full stop', 'No full stop']
  ])('%s', (text, expected) => {
    expect(firstSentence(text)).toBe(expected);
  });
});

const variable = (name: string, role: string, file?: string, line?: number) => ({
  name,
  role,
  required: true,
  evidence: file === undefined ? [] : [{ file, line, quote: name }]
});

const stateWith = (services: unknown[], gaps: Array<{ subject: string; message: string }> = []): WizardState =>
  ({
    phase: 'reviewing',
    projectName: 'demo',
    timeline: [],
    answers: {},
    facts: { services, dependencies: [], existingDeployments: [], decisions: [] },
    composition: {
      resources: {},
      provenance: {},
      gaps,
      unsetSettings: [],
      deployable: true
    }
  }) as unknown as WizardState;

describe('planSecrets', () => {
  it('groups by the resource that reads them, with the line that reads each, and the generable ones first', () => {
    const state = stateWith([
      {
        name: 'app',
        environmentVariables: [
          variable('POSTGRES_URL', 'infra-dependency', 'package.json', 29),
          variable('STRIPE_SECRET_KEY', 'third-party-secret', 'lib/payments/stripe.ts', 10),
          variable('AUTH_SECRET', 'third-party-secret', 'lib/auth/session.ts', 6)
        ]
      }
    ]);
    const plan = planSecrets(state, {
      app: {
        type: 'nextjs-web',
        properties: {
          environment: [
            { name: 'POSTGRES_URL', value: "$ResourceParam('db', 'connectionString')" },
            { name: 'STRIPE_SECRET_KEY', value: "$Secret('stripe_secret_key')" },
            { name: 'AUTH_SECRET', value: "$Secret('auth_secret')" }
          ]
        }
      }
    });
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]!.resourceName).toBe('app');
    expect(plan.entries.map((entry) => [entry.variable, entry.name, entry.canGenerate, entry.source?.file])).toEqual([
      ['AUTH_SECRET', 'auth_secret', true, 'lib/auth/session.ts'],
      ['STRIPE_SECRET_KEY', 'stripe_secret_key', false, 'lib/payments/stripe.ts']
    ]);
  });

  it('keeps settings from deployment files apart from secrets, and names what Stacktape sets itself', () => {
    const state = stateWith(
      [
        {
          name: 'backend',
          environmentVariables: [
            variable('SECRET_KEY', 'third-party-secret', 'compose.yml', 64),
            variable('DOMAIN', 'runtime-config', 'compose.yml', 60),
            variable('POSTGRES_PASSWORD', 'infra-dependency', 'compose.yml', 17)
          ]
        }
      ],
      [{ subject: 'backend.runtime-settings', message: 'These app settings have values in deployment files: DOMAIN.' }]
    );
    const plan = planSecrets(state, {
      backend: {
        type: 'web-service',
        properties: {
          environment: [
            { name: 'SECRET_KEY', value: "$Secret('secret_key')" },
            { name: 'DOMAIN', value: "$Secret('domain')" },
            { name: 'POSTGRES_PASSWORD', value: "$Secret('demo-mainDatabase.password')" }
          ]
        }
      },
      mainDatabase: {
        type: 'relational-database',
        properties: { credentials: { masterUserPassword: "$Secret('demo-mainDatabase.password')" } }
      }
    });
    expect(plan.groups.map((group) => [group.kind, group.from, group.entries.map((entry) => entry.variable)])).toEqual([
      ['secret', undefined, ['SECRET_KEY']],
      ['setting', 'compose.yml', ['DOMAIN']]
    ]);
    expect(plan.setByStacktape).toEqual(['POSTGRES_PASSWORD']);
    expect(plan.explainedGaps).toEqual(['backend.runtime-settings']);
  });

  it('says which outside service an address belongs to, and which secrets the code reads that the deploy does not need', () => {
    const gap = {
      subject: 'messageBroker',
      message:
        'Your app needs a RabbitMQ broker, which Stacktape does not create. Use a hosted one and give the app its URL through the rmq_url secret, which you create before deploying.'
    };
    const state = stateWith(
      [
        {
          name: 'go-clean-template',
          environmentVariables: [
            variable('RMQ_URL', 'infra-dependency', 'go.mod', 33),
            variable('SENTRY_AUTH_TOKEN', 'third-party-secret', 'react-router.config.ts', 17)
          ]
        }
      ],
      [gap]
    );
    const plan = planSecrets(state, {
      goCleanTemplate: {
        type: 'web-service',
        properties: { environment: [{ name: 'RMQ_URL', value: "$Secret('rmq_url')" }] }
      }
    });
    expect(plan.entries).toEqual([
      {
        name: 'rmq_url',
        variable: 'RMQ_URL',
        kind: 'outside',
        source: { file: 'go.mod', line: 33 },
        canGenerate: false,
        note: 'Your app needs a RabbitMQ broker, which Stacktape does not create.'
      }
    ]);
    expect(plan.explainedGaps).toEqual(['messageBroker']);
    expect(plan.notNeeded).toEqual(['SENTRY_AUTH_TOKEN']);
  });
});
