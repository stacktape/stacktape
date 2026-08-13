import { describe, expect, test } from 'bun:test';
import type { StpEmailSender } from '../resolved-types/email-senders';
import { validateEmailSenderConfig, validateEmailSenderIdentityUniqueness } from './email-senders';

const sender = (name: string, properties: Partial<StpEmailSender> = {}): StpEmailSender => ({
  name,
  nameChain: [name],
  type: 'email-sender',
  configParentResourceType: 'email-sender',
  identity: 'example.com',
  ...properties
});

describe('email sender configuration validation', () => {
  test('treats omitted manageIdentity as managed and rejects an external configuration set', () => {
    expect(() =>
      validateEmailSenderConfig({ resource: sender('mail', { configurationSetName: 'external-set' }) })
    ).toThrow('cannot set `configurationSetName`');
  });

  test('allows an optional configuration set only for externally managed identities', () => {
    expect(() =>
      validateEmailSenderConfig({
        resource: sender('mail', { configurationSetName: 'external-set', manageIdentity: false })
      })
    ).not.toThrow();
    expect(() => validateEmailSenderConfig({ resource: sender('mail', { manageIdentity: false }) })).not.toThrow();
  });

  test('rejects duplicate canonical identities in one configuration', () => {
    expect(() => validateEmailSenderIdentityUniqueness([sender('mail'), sender('otherMail')])).toThrow(
      'declared by multiple resources'
    );
  });
});
