import { describe, expect, it } from 'bun:test';
import { requiredSecrets, secretCommand } from './required-secrets';

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
        properties: { environment: [{ name: 'RMQ_URL', value: "$Secret('rmq_url')" }] }
      }
    };
    expect(requiredSecrets(resources)).toEqual(['payments', 'rmq_url']);
  });

  it('finds nothing in a configuration without secret references', () => {
    expect(requiredSecrets({ app: { type: 'nextjs-web', properties: { appDirectory: '.' } } })).toEqual([]);
  });

  it('builds a command that prompts for the value', () => {
    expect(secretCommand('rmq_url', 'eu-west-1')).toBe('stacktape secret:set --secretName rmq_url --region eu-west-1');
  });
});
