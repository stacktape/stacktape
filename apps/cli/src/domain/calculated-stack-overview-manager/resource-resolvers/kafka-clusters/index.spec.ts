import { beforeAll, describe, expect, test } from 'bun:test';
import type { StpKafkaCluster } from '@domain-services/config-manager/resolved-types/kafka-clusters';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { MSK_SERVERLESS_REGIONS } from '@stacktape/config/kafka-clusters';
import { getKafkaCluster, getKafkaClusterSecurityGroup, getKafkaClusterSelfIngress } from '.';

const resource: StpKafkaCluster = {
  name: 'events',
  nameChain: ['events'],
  type: 'kafka-cluster',
  configParentResourceType: 'kafka-cluster'
};

describe('Kafka cluster synthesis', () => {
  beforeAll(async () => {
    await calculatedStackOverviewManager.init({
      context: {
        accountId: '123456789012',
        command: 'synth',
        globallyUniqueStackHash: 'hash',
        invocationId: 'invocation',
        projectName: 'project',
        region: 'eu-west-1',
        stackName: 'project-production',
        stage: 'production',
        workingDir: 'C:/project'
      }
    });
  });

  test('uses IAM auth and leaves no ordinary infrastructure knobs', () => {
    expect(getKafkaCluster({ resource })).toMatchObject({
      Type: 'AWS::MSK::ServerlessCluster',
      Properties: {
        ClusterName: `${calculatedStackOverviewManager.context.stackName}-events`,
        ClientAuthentication: { Sasl: { Iam: { Enabled: true } } },
        VpcConfigs: [{ SecurityGroups: [{ Ref: expect.any(String) }] }]
      }
    });
  });

  test('tracks current MSK Serverless availability inside the Stacktape region catalog', () => {
    expect(MSK_SERVERLESS_REGIONS).toContain('eu-west-1');
    expect(MSK_SERVERLESS_REGIONS).not.toContain('ap-east-1');
    expect(MSK_SERVERLESS_REGIONS).not.toContain('ap-northeast-3');
    expect(MSK_SERVERLESS_REGIONS).not.toContain('eu-south-1');
  });

  test('uses standalone self ingress to avoid a CloudFormation circular dependency', () => {
    const securityGroup = getKafkaClusterSecurityGroup({ resource, connectToReferences: [] });
    expect(JSON.stringify(securityGroup)).not.toContain('SourceSecurityGroupId');
    const selfIngress = getKafkaClusterSelfIngress({ resource }).Properties;
    expect(selfIngress).toEqual({
      GroupId: { Ref: expect.any(String) },
      SourceSecurityGroupId: selfIngress.GroupId,
      FromPort: 9098,
      ToPort: 9098,
      IpProtocol: 'tcp'
    });
  });
});
