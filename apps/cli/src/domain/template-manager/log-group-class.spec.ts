import { describe, expect, test } from 'bun:test';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { validateImmutableLogGroupClasses, validateInfrequentAccessSubscriptions } from './log-group-class';

const template = (logGroupClass?: 'STANDARD' | 'INFREQUENT_ACCESS'): CloudFormationTemplate => ({
  AWSTemplateFormatVersion: '2010-09-09',
  Resources: {
    WorkerLogGroup: {
      Type: 'AWS::Logs::LogGroup',
      Properties: {
        LogGroupName: '/aws/lambda/worker',
        ...(logGroupClass ? { LogGroupClass: logGroupClass } : {})
      }
    }
  },
  Outputs: {},
  Parameters: {},
  Mappings: {},
  Conditions: {},
  Hooks: {}
});

describe('log group class deployment preflight', () => {
  test('treats an omitted class as Standard and allows unchanged classes', () => {
    expect(() =>
      validateImmutableLogGroupClasses({ previousTemplate: template(), candidateTemplate: template('STANDARD') })
    ).not.toThrow();
    expect(() =>
      validateImmutableLogGroupClasses({
        previousTemplate: template('INFREQUENT_ACCESS'),
        candidateTemplate: template('INFREQUENT_ACCESS')
      })
    ).not.toThrow();
  });

  test('blocks changing either immutable class before CloudFormation', () => {
    expect(() =>
      validateImmutableLogGroupClasses({
        previousTemplate: template(),
        candidateTemplate: template('INFREQUENT_ACCESS')
      })
    ).toThrow('cannot be changed');
    expect(() =>
      validateImmutableLogGroupClasses({
        previousTemplate: template('INFREQUENT_ACCESS'),
        candidateTemplate: template()
      })
    ).toThrow('cannot be changed');
  });

  test('allows selecting a class for a newly created logical resource', () => {
    const previous = template();
    previous.Resources = {};
    expect(() =>
      validateImmutableLogGroupClasses({ previousTemplate: previous, candidateTemplate: template('INFREQUENT_ACCESS') })
    ).not.toThrow();
  });
});

describe('log group class subscription compatibility', () => {
  const withSubscription = (logGroupClass: 'STANDARD' | 'INFREQUENT_ACCESS'): CloudFormationTemplate => ({
    ...template(logGroupClass),
    Resources: {
      ...template(logGroupClass).Resources,
      WorkerSubscription: {
        Type: 'AWS::Logs::SubscriptionFilter',
        Properties: {
          DestinationArn: 'arn:aws:lambda:eu-west-1:123456789012:function:subscriber',
          FilterPattern: '',
          LogGroupName: {
            'Fn::Select': [6, { 'Fn::Split': [':', { 'Fn::GetAtt': ['WorkerLogGroup', 'Arn'] }] }]
          }
        }
      }
    }
  });

  test('rejects a same-stack subscription targeting Infrequent Access', () => {
    expect(() =>
      validateInfrequentAccessSubscriptions({ candidateTemplate: withSubscription('INFREQUENT_ACCESS') })
    ).toThrow('does not support subscription filters');

    const literalName = withSubscription('INFREQUENT_ACCESS');
    (literalName.Resources.WorkerSubscription.Properties as { LogGroupName: unknown }).LogGroupName =
      '/aws/lambda/worker';
    expect(() => validateInfrequentAccessSubscriptions({ candidateTemplate: literalName })).toThrow(
      'does not support subscription filters'
    );
  });

  test('allows the same subscription for Standard and does not guess about external log groups', () => {
    expect(() =>
      validateInfrequentAccessSubscriptions({ candidateTemplate: withSubscription('STANDARD') })
    ).not.toThrow();
    const external = withSubscription('INFREQUENT_ACCESS');
    (external.Resources.WorkerSubscription.Properties as { LogGroupName: unknown }).LogGroupName =
      '/aws/lambda/external';
    expect(() => validateInfrequentAccessSubscriptions({ candidateTemplate: external })).not.toThrow();
  });
});
