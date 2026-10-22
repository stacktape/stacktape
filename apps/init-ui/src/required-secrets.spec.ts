import { describe, expect, it } from 'bun:test';
import { requiredSecrets, requiredSecretVariables, secretCommand } from './required-secrets';

describe('requiredSecrets', () => {
  it('lists secrets the user must create and skips database passwords the deploy generates', () => {
    const resources = {
      mainDatabase: {
        type: 'relational-database',
        properties: { credentials: { masterUserPassword: "$Secret('shop-mainDatabase.password')" } }
      },
      cache: { type: 'redis-cluster', properties: { defaultUserPassword: "$Secret('shop-cache.password')" } },
      api: {
        type: 'web-service',
        properties: {
          environment: [
            { name: 'RMQ_URL', value: "$Secret('rmq_url')" },
            { name: 'STRIPE', value: "$Secret('payments.stripeKey')" },
            { name: 'NODE_ENV', value: 'production' }
          ]
        }
      },
      worker: {
        type: 'worker-service',
        properties: {
          environment: [
            { name: 'RMQ_URL', value: "$Secret('rmq_url')" },
            // The app reads the generated password too; it is still generated, not asked for.
            { name: 'POSTGRES_PASSWORD', value: "$Secret('shop-mainDatabase.password')" }
          ]
        }
      }
    };
    expect(requiredSecrets(resources)).toEqual(['payments', 'rmq_url']);
    // Named as the app reads them, once each, and never the generated password.
    expect(requiredSecretVariables(resources)).toEqual(['RMQ_URL', 'STRIPE']);
  });

  it('finds nothing in a configuration without secret references', () => {
    expect(requiredSecrets({ app: { type: 'nextjs-web', properties: { appDirectory: '.' } } })).toEqual([]);
  });

  it('builds a command that prompts for the value', () => {
    expect(secretCommand('rmq_url', 'eu-west-1')).toBe('stacktape secret set rmq_url --region eu-west-1');
    // The account the wizard was started with, kept in one argument even when its name has spaces.
    expect(secretCommand('rmq_url', 'eu-west-1', 'Development Account')).toBe(
      'stacktape secret set rmq_url --region eu-west-1 --aws-account "Development Account"'
    );
  });
});
