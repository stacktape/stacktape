import { equals, getAtt, not, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { cfnResource, type CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { getSharedEmailConfigurationSetName, getSharedEmailFeedbackTopicName } from '@stacktape/naming/shared-stacks';
import { isEmailAddressIdentity } from './identity';

export const EMAIL_IDENTITY_STACK_CONTRACT_VERSION = 1;

const retain = <T extends ReturnType<typeof cfnResource>>(resource: T) => ({
  ...resource,
  DeletionPolicy: 'RetainExceptOnCreate' as const,
  UpdateReplacePolicy: 'Retain' as const
});

export const buildManagedEmailIdentityTemplate = ({
  canonicalIdentity
}: {
  canonicalIdentity: string;
}): CloudFormationTemplate => {
  const configurationSetName = getSharedEmailConfigurationSetName(canonicalIdentity);
  const feedbackTopicName = getSharedEmailFeedbackTopicName(canonicalIdentity);
  const sharedTags = [
    { Key: 'stacktape:shared-resource-kind', Value: 'email-identity' },
    { Key: 'stacktape:shared-resource-identity', Value: canonicalIdentity },
    { Key: 'stacktape:shared-resource-contract-version', Value: `${EMAIL_IDENTITY_STACK_CONTRACT_VERSION}` }
  ];
  const resources: CloudFormationTemplate['Resources'] = {
    ConfigurationSet: retain(
      cfnResource('AWS::SES::ConfigurationSet', {
        Name: configurationSetName,
        SuppressionOptions: { SuppressedReasons: ['BOUNCE', 'COMPLAINT'] },
        Tags: sharedTags
      })
    ),
    FeedbackTopic: retain(cfnResource('AWS::SNS::Topic', { TopicName: feedbackTopicName, Tags: sharedTags })),
    FeedbackTopicPolicy: retain(
      cfnResource('AWS::SNS::TopicPolicy', {
        Topics: [getAtt('FeedbackTopic', 'TopicArn')],
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'AllowSesFeedbackPublishing',
              Effect: 'Allow',
              Principal: { Service: 'ses.amazonaws.com' },
              Action: 'sns:Publish',
              Resource: getAtt('FeedbackTopic', 'TopicArn'),
              Condition: {
                StringEquals: { 'AWS:SourceAccount': ref('AWS::AccountId') },
                ArnEquals: {
                  'AWS:SourceArn': sub(
                    `arn:\${AWS::Partition}:ses:\${AWS::Region}:\${AWS::AccountId}:configuration-set/${configurationSetName}`
                  )
                }
              }
            }
          ]
        }
      })
    ),
    FeedbackDestination: retain({
      ...cfnResource('AWS::SES::ConfigurationSetEventDestination', {
        ConfigurationSetName: configurationSetName,
        EventDestination: {
          Enabled: true,
          MatchingEventTypes: ['BOUNCE', 'COMPLAINT'],
          Name: 'stacktape-bounces-and-complaints',
          SnsDestination: { TopicARN: getAtt('FeedbackTopic', 'TopicArn') }
        }
      }),
      DependsOn: ['ConfigurationSet', 'FeedbackTopicPolicy']
    }),
    EmailIdentity: retain({
      ...cfnResource('AWS::SES::EmailIdentity', {
        EmailIdentity: canonicalIdentity,
        ConfigurationSetAttributes: { ConfigurationSetName: configurationSetName },
        ...(!isEmailAddressIdentity(canonicalIdentity)
          ? {
              DkimAttributes: { SigningEnabled: true },
              DkimSigningAttributes: { NextSigningKeyLength: 'RSA_2048_BIT' }
            }
          : {}),
        Tags: sharedTags
      }),
      DependsOn: 'ConfigurationSet'
    })
  };

  if (!isEmailAddressIdentity(canonicalIdentity)) {
    for (const index of [1, 2, 3] as const) {
      resources[`DkimRecord${index}`] = retain({
        ...cfnResource('AWS::Route53::RecordSet', {
          HostedZoneId: ref('HostedZoneId'),
          Name: getAtt('EmailIdentity', `DkimDNSTokenName${index}`),
          ResourceRecords: [getAtt('EmailIdentity', `DkimDNSTokenValue${index}`)],
          TTL: '1800',
          Type: 'CNAME'
        }),
        Condition: 'HasHostedZone'
      });
    }
  }

  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Stacktape shared resource: email-identity',
    Parameters: { HostedZoneId: { Type: 'String', Default: '' } },
    Conditions: { HasHostedZone: not(equals(ref('HostedZoneId'), '')) },
    Resources: resources,
    Outputs: {
      ContractVersion: { Value: `${EMAIL_IDENTITY_STACK_CONTRACT_VERSION}` },
      ResourceKind: { Value: 'email-identity' },
      OwnershipKey: { Value: canonicalIdentity },
      CanonicalIdentity: { Value: canonicalIdentity },
      HostedZoneId: { Value: ref('HostedZoneId') },
      ConfigurationSetName: { Value: configurationSetName },
      FeedbackTopicArn: { Value: getAtt('FeedbackTopic', 'TopicArn') },
      IdentityArn: {
        Value: sub(`arn:\${AWS::Partition}:ses:\${AWS::Region}:\${AWS::AccountId}:identity/${canonicalIdentity}`)
      },
      ...(!isEmailAddressIdentity(canonicalIdentity)
        ? Object.fromEntries(
            ([1, 2, 3] as const).flatMap((index) => [
              [`DkimDNSTokenName${index}`, { Value: getAtt('EmailIdentity', `DkimDNSTokenName${index}`) }],
              [`DkimDNSTokenValue${index}`, { Value: getAtt('EmailIdentity', `DkimDNSTokenValue${index}`) }]
            ])
          )
        : {})
    }
  };
};
