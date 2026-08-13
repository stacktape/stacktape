import { describe, expect, test } from 'bun:test';
import { buildManagedEmailIdentityTemplate } from './template';

const getProperties = <Properties>(resource: unknown): Properties => {
  if (!resource || typeof resource !== 'object' || !('Properties' in resource)) {
    throw new Error('Expected a CloudFormation resource with properties.');
  }
  return resource.Properties as Properties;
};

describe('managed email identity shared template', () => {
  test('owns suppression, identity-wide feedback, termination-safe resources, and exact DKIM records', () => {
    const template = buildManagedEmailIdentityTemplate({ canonicalIdentity: 'example.com' });
    const identity = getProperties<{
      DkimAttributes?: { SigningEnabled: boolean };
      DkimSigningAttributes?: { NextSigningKeyLength: string };
    }>(template.Resources.EmailIdentity);
    const configurationSet = getProperties<{ SuppressionOptions: { SuppressedReasons: string[] } }>(
      template.Resources.ConfigurationSet
    );
    const topicPolicy = getProperties<{ PolicyDocument: { Statement: unknown[] } }>(
      template.Resources.FeedbackTopicPolicy
    );
    const feedbackDestination = getProperties<{ EventDestination: { MatchingEventTypes: string[] } }>(
      template.Resources.FeedbackDestination
    );

    expect(configurationSet.SuppressionOptions.SuppressedReasons).toEqual(['BOUNCE', 'COMPLAINT']);
    expect(identity.DkimAttributes).toEqual({ SigningEnabled: true });
    expect(identity.DkimSigningAttributes).toEqual({ NextSigningKeyLength: 'RSA_2048_BIT' });
    expect(feedbackDestination.EventDestination.MatchingEventTypes).toEqual(['BOUNCE', 'COMPLAINT']);
    expect(topicPolicy.PolicyDocument.Statement[0]).toMatchObject({
      Principal: { Service: 'ses.amazonaws.com' },
      Action: 'sns:Publish',
      Condition: { StringEquals: { 'AWS:SourceAccount': { Ref: 'AWS::AccountId' } } }
    });
    expect(template.Resources.DkimRecord1).toMatchObject({
      Condition: 'HasHostedZone',
      DeletionPolicy: 'RetainExceptOnCreate',
      UpdateReplacePolicy: 'Retain',
      Properties: {
        Name: { 'Fn::GetAtt': ['EmailIdentity', 'DkimDNSTokenName1'] },
        ResourceRecords: [{ 'Fn::GetAtt': ['EmailIdentity', 'DkimDNSTokenValue1'] }]
      }
    });
    expect(template.Outputs?.DkimDNSTokenName3?.Value).toEqual({
      'Fn::GetAtt': ['EmailIdentity', 'DkimDNSTokenName3']
    });
    expect(JSON.stringify(template)).not.toMatch(/project|stage/i);
  });

  test('exact email identities use verification email and omit domain-only DKIM settings and records', () => {
    const template = buildManagedEmailIdentityTemplate({ canonicalIdentity: 'Billing@example.com' });
    const identity = getProperties<{
      DkimAttributes?: { SigningEnabled: boolean };
      DkimSigningAttributes?: { NextSigningKeyLength: string };
    }>(template.Resources.EmailIdentity);
    expect(identity.DkimAttributes).toBeUndefined();
    expect(identity.DkimSigningAttributes).toBeUndefined();
    expect(template.Resources.DkimRecord1).toBeUndefined();
    expect(template.Outputs?.DkimDNSTokenName1).toBeUndefined();
  });
});
