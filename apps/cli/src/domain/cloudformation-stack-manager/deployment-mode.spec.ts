import { describe, expect, test } from 'bun:test';
import { chooseDeleteDeploymentMode, chooseUpdateDeploymentMode } from './deployment-mode';

const fn = { Type: 'AWS::Lambda::Function', Properties: { MemorySize: 256 } };
const rule = (rate: string) => ({
  Type: 'AWS::Events::Rule',
  Properties: { ScheduleExpression: rate, Targets: [{ Arn: { 'Fn::GetAtt': ['Fn', 'Arn'] }, Id: 'fn' }] }
});
const permission = {
  Type: 'AWS::Lambda::Permission',
  Properties: { Action: 'lambda:InvokeFunction', FunctionName: { Ref: 'Fn' }, Principal: 'events.amazonaws.com' }
};
const deployed = { Resources: { Fn: fn, Queue: { Type: 'AWS::SQS::Queue' } } };
const mode = (newResources: Record<string, unknown>, options: { stackSettingChanged?: boolean } = {}) =>
  chooseUpdateDeploymentMode({
    oldTemplate: deployed,
    newTemplate: { Resources: { ...deployed.Resources, ...newResources } } as never,
    stackSettingChanged: options.stackSettingChanged ?? false
  });

describe('chooseUpdateDeploymentMode', () => {
  test('a new schedule (rule and its permission) uses express mode', () => {
    expect(mode({ FnEvent0Rule: rule('rate(1 hour)'), FnEvent0Permission: permission })).toBe('EXPRESS');
  });

  test('any other changed resource keeps the standard mode', () => {
    expect(mode({ FnEvent0Rule: rule('rate(1 hour)'), Fn: { ...fn, Properties: { MemorySize: 512 } } })).toBe(
      'STANDARD'
    );
    expect(mode({ FnEvent0Rule: rule('rate(1 hour)'), Topic: { Type: 'AWS::SNS::Topic' } })).toBe('STANDARD');
  });

  test('removing a resource of another type keeps the standard mode', () => {
    expect(
      chooseUpdateDeploymentMode({
        oldTemplate: deployed,
        newTemplate: { Resources: { Fn: fn, FnEvent0Rule: rule('rate(1 hour)') } } as never,
        stackSettingChanged: false
      })
    ).toBe('STANDARD');
  });

  test('changing an existing rule gains nothing and keeps the standard mode', () => {
    const withRule = { Resources: { ...deployed.Resources, FnEvent0Rule: rule('rate(1 hour)') } };
    expect(
      chooseUpdateDeploymentMode({
        oldTemplate: withRule,
        newTemplate: { Resources: { ...withRule.Resources, FnEvent0Rule: rule('rate(2 hours)') } } as never,
        stackSettingChanged: false
      })
    ).toBe('STANDARD');
  });

  test('a changed condition, mapping or parameter keeps the standard mode: it can change resources indirectly', () => {
    const withRule = { ...deployed.Resources, FnEvent0Rule: rule('rate(1 hour)') };
    for (const section of ['Conditions', 'Mappings', 'Parameters'] as const) {
      expect(
        chooseUpdateDeploymentMode({
          oldTemplate: { ...deployed, [section]: { Release: { value: 'one' } } },
          newTemplate: { Resources: withRule, [section]: { Release: { value: 'two' } } } as never,
          stackSettingChanged: false
        })
      ).toBe('STANDARD');
    }
    expect(
      chooseUpdateDeploymentMode({
        oldTemplate: { ...deployed, Outputs: { Url: { Value: 'one' } } },
        newTemplate: { Resources: withRule, Outputs: { Url: { Value: 'two' } } } as never,
        stackSettingChanged: false
      })
    ).toBe('EXPRESS');
  });

  test('no change, a changed stack setting, a transform or an unknown deployed template keep the standard mode', () => {
    expect(mode({})).toBe('STANDARD');
    expect(mode({ FnEvent0Rule: rule('rate(1 hour)') }, { stackSettingChanged: true })).toBe('STANDARD');
    expect(
      chooseUpdateDeploymentMode({
        oldTemplate: deployed,
        newTemplate: { Transform: 'AWS::Serverless-2016-10-31', Resources: { FnEvent0Rule: rule('rate(1 hour)') } },
        stackSettingChanged: false
      } as never)
    ).toBe('STANDARD');
    expect(
      chooseUpdateDeploymentMode({
        oldTemplate: undefined,
        newTemplate: { Resources: { FnEvent0Rule: rule('rate(1 hour)') } } as never,
        stackSettingChanged: false
      })
    ).toBe('STANDARD');
  });
});

describe('chooseDeleteDeploymentMode', () => {
  test('stacks without an ElastiCache user group delete in express mode', () => {
    expect(chooseDeleteDeploymentMode(['AWS::SQS::Queue', 'AWS::ElastiCache::ReplicationGroup', undefined])).toBe(
      'EXPRESS'
    );
    expect(chooseDeleteDeploymentMode([])).toBe('EXPRESS');
  });

  test('a serverless cache stack waits for its user group before deleting the user', () => {
    expect(
      chooseDeleteDeploymentMode([
        'AWS::ElastiCache::ServerlessCache',
        'AWS::ElastiCache::UserGroup',
        'AWS::ElastiCache::User'
      ])
    ).toBe('STANDARD');
  });
});
