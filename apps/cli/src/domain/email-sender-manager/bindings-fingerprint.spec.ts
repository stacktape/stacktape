import { describe, expect, test } from 'bun:test';
import { emailSenderBindingsNeedDevStackUpdate, getEmailSenderBindingsFingerprint } from './bindings-fingerprint';

const managed = { identity: 'example.com', name: 'mail' };

describe('email sender dev-stack bindings fingerprint', () => {
  test('is deterministic across config ordering', () => {
    const first = getEmailSenderBindingsFingerprint({
      senders: [managed, { identity: 'Billing@example.com', manageIdentity: false, name: 'billing' }],
      resources: [
        { connectTo: ['mail'], name: 'worker', nameChain: ['worker'] },
        { connectTo: ['billing', 'mail'], name: 'api', nameChain: ['api'] }
      ]
    });
    const reordered = getEmailSenderBindingsFingerprint({
      senders: [{ identity: 'Billing@example.com', manageIdentity: false, name: 'billing' }, managed],
      resources: [
        { connectTo: ['mail', 'billing', 'mail'], name: 'api', nameChain: ['api'] },
        { connectTo: ['mail'], name: 'worker', nameChain: ['worker'] }
      ]
    });
    expect(reordered).toBe(first);
    expect(first).toMatch(/^v1:[a-f0-9]{24}$/);
  });

  test('changes for sender identity, mode, external config set, and connectTo edges', () => {
    const base = getEmailSenderBindingsFingerprint({
      senders: [managed],
      resources: [{ connectTo: ['mail'], name: 'api' }]
    });
    const variants = [
      getEmailSenderBindingsFingerprint({ senders: [{ ...managed, identity: 'other.example.com' }], resources: [] }),
      getEmailSenderBindingsFingerprint({ senders: [{ ...managed, manageIdentity: false }], resources: [] }),
      getEmailSenderBindingsFingerprint({
        senders: [{ ...managed, configurationSetName: 'external', manageIdentity: false }],
        resources: []
      }),
      getEmailSenderBindingsFingerprint({ senders: [managed], resources: [] })
    ];
    for (const variant of variants) expect(variant).not.toBe(base);
  });

  test('keeps old no-email dev stacks fast but updates additions, changes, and removals once', () => {
    const empty = getEmailSenderBindingsFingerprint({ resources: [], senders: [] });
    const withEmail = getEmailSenderBindingsFingerprint({ resources: [], senders: [managed] });

    expect(
      emailSenderBindingsNeedDevStackUpdate({
        deployedFingerprint: undefined,
        desiredFingerprint: empty,
        hasEmailSenders: false
      })
    ).toBe(false);
    expect(
      emailSenderBindingsNeedDevStackUpdate({
        deployedFingerprint: undefined,
        desiredFingerprint: withEmail,
        hasEmailSenders: true
      })
    ).toBe(true);
    expect(
      emailSenderBindingsNeedDevStackUpdate({
        deployedFingerprint: withEmail,
        desiredFingerprint: empty,
        hasEmailSenders: false
      })
    ).toBe(true);
    expect(
      emailSenderBindingsNeedDevStackUpdate({
        deployedFingerprint: empty,
        desiredFingerprint: empty,
        hasEmailSenders: false
      })
    ).toBe(false);
  });
});
