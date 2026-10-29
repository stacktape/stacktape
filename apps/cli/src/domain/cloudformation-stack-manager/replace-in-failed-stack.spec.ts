import { expect, test } from 'bun:test';
import { templateWithoutResources } from './replace-in-failed-stack';

const template = {
  Resources: {
    Db: { Type: 'AWS::RDS::DBInstance', Properties: { DBSubnetGroupName: { Ref: 'SubnetGroup' } } },
    SubnetGroup: { Type: 'AWS::RDS::DBSubnetGroup', Properties: {} },
    TaskDefinition: { Type: 'AWS::ECS::TaskDefinition', Properties: { Image: 'app' } },
    Service: { Type: 'AWS::ECS::Service', Properties: { TaskDefinition: { Ref: 'TaskDefinition' } } },
    ScalingTarget: {
      Type: 'AWS::ApplicationAutoScaling::ScalableTarget',
      Properties: { ResourceId: { 'Fn::Sub': 'service/cluster/${Service.Name}' } }
    },
    Alarm: { Type: 'AWS::CloudWatch::Alarm', DependsOn: 'ScalingTarget', Properties: {} },
    Unrelated: { Type: 'AWS::Logs::LogGroup', Properties: { Name: { 'Fn::Sub': '${AWS::StackName}-logs' } } },
    Policy: { Type: 'AWS::IAM::Policy', Properties: { Arn: { 'Fn::GetAtt': 'TaskDefinition.Arn' } } }
  },
  Outputs: {
    ServiceName: { Value: { 'Fn::GetAtt': ['Service', 'Name'] } },
    DbEndpoint: { Value: { 'Fn::GetAtt': ['Db', 'Endpoint.Address'] } }
  }
};

test('removes the resources, everything that depends on them, and outputs that refer to them', () => {
  const result = templateWithoutResources(template as never, ['TaskDefinition']);
  expect(result.removedResources).toEqual(['Alarm', 'Policy', 'ScalingTarget', 'Service', 'TaskDefinition']);
  expect(Object.keys(result.template.Resources).toSorted()).toEqual(['Db', 'SubnetGroup', 'Unrelated']);
  expect(Object.keys(result.template.Outputs ?? {})).toEqual(['DbEndpoint']);
  expect(result.removedDataResources).toEqual([]);
});

test('reports a data store that would be removed with what it depends on', () => {
  const result = templateWithoutResources(template as never, ['SubnetGroup']);
  expect(result.removedResources).toEqual(['Db', 'SubnetGroup']);
  expect(result.removedDataResources).toEqual(['Db']);
});

test('leaves out an empty Outputs section, which CloudFormation rejects', () => {
  const result = templateWithoutResources(template as never, ['TaskDefinition', 'Db']);
  expect(result.template.Outputs).toBeUndefined();
});
