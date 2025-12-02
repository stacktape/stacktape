import { describe, expect, test } from 'bun:test';
import { cfLogicalNames } from './logical-names';

describe('logical-names', () => {
  describe('basic resource naming', () => {
    test('bucket should generate logical name', () => {
      const name = cfLogicalNames.bucket('my-resource');
      expect(name).toBeDefined();
      expect(typeof name).toBe('string');
      expect(name).toMatch(/^[A-Z]/); // Should start with uppercase (PascalCase)
    });

    test('lambda should generate logical name', () => {
      const name = cfLogicalNames.lambda('my-function');
      expect(name).toBeDefined();
      expect(name).toContain('Function');
    });

    test('dynamoGlobalTable should generate logical name', () => {
      const name = cfLogicalNames.dynamoGlobalTable('my-table');
      expect(name).toBeDefined();
      expect(name).toContain('GlobalTable');
    });

    test('dynamoRegionalTable should generate logical name', () => {
      const name = cfLogicalNames.dynamoRegionalTable('my-table');
      expect(name).toBeDefined();
      expect(name).toContain('Table');
    });
  });

  describe('naming with specifiers', () => {
    test('cloudfrontDistribution should include specifier', () => {
      const name = cfLogicalNames.cloudfrontDistribution('my-cdn', 0);
      expect(name).toContain('Cdn');
      expect(name).toContain('Distribution');
    });

    test('lambda with service function flag should include CustomResource specifier', () => {
      const regularName = cfLogicalNames.lambda('my-function', false);
      const serviceName = cfLogicalNames.lambda('my-function', true);
      expect(regularName).not.toBe(serviceName);
      expect(serviceName).toContain('CustomResource');
    });

    test('ecsService with blueGreen flag should include specifier', () => {
      const regularName = cfLogicalNames.ecsService('my-service', false);
      const bgName = cfLogicalNames.ecsService('my-service', true);
      expect(regularName).not.toBe(bgName);
      expect(bgName).toContain('BlueGreen');
    });

    test('customResourceDefaultDomain with CDN should include Cdn specifier', () => {
      const nonCdn = cfLogicalNames.customResourceDefaultDomain('resource', false);
      const cdn = cfLogicalNames.customResourceDefaultDomain('resource', true);
      expect(nonCdn).not.toBe(cdn);
      expect(cdn).toContain('Cdn');
    });
  });

  describe('naming with indices', () => {
    test('subnet should use index', () => {
      const subnet0 = cfLogicalNames.subnet(true, 0);
      const subnet1 = cfLogicalNames.subnet(true, 1);
      expect(subnet0).not.toBe(subnet1);
      expect(subnet0).toContain('0');
      expect(subnet1).toContain('1');
    });

    test('subnet should differentiate public and private', () => {
      const publicSubnet = cfLogicalNames.subnet(true, 0);
      const privateSubnet = cfLogicalNames.subnet(false, 0);
      expect(publicSubnet).not.toBe(privateSubnet);
      expect(publicSubnet).toContain('Public');
      expect(privateSubnet).toContain('Private');
    });

    test('auroraDbInstance should use index', () => {
      const instance0 = cfLogicalNames.auroraDbInstance('my-db', 0);
      const instance1 = cfLogicalNames.auroraDbInstance('my-db', 1);
      expect(instance0).not.toBe(instance1);
    });

    test('eventBusRule should use event index', () => {
      const rule0 = cfLogicalNames.eventBusRule('my-resource', 0);
      const rule1 = cfLogicalNames.eventBusRule('my-resource', 1);
      expect(rule0).not.toBe(rule1);
      expect(rule0).toContain('Event0');
      expect(rule1).toContain('Event1');
    });
  });

  describe('naming with subtypes', () => {
    test('auroraDbClusterLogGroup should include log group type', () => {
      const auditLog = cfLogicalNames.auroraDbClusterLogGroup('my-db', 'audit');
      const errorLog = cfLogicalNames.auroraDbClusterLogGroup('my-db', 'error');
      expect(auditLog).not.toBe(errorLog);
      expect(auditLog).toContain('Audit');
      expect(errorLog).toContain('Error');
    });

    test('dbInstanceLogGroup should include log group type', () => {
      const slowQueryLog = cfLogicalNames.dbInstanceLogGroup('my-db', 'slowQuery');
      expect(slowQueryLog).toContain('SlowQuery');
    });
  });

  describe('global resources without stpResourceName', () => {
    test('vpc should not require resource name', () => {
      const name = cfLogicalNames.vpc();
      expect(name).toBeDefined();
      expect(name).toContain('Vpc');
      expect(name).toContain('Stp'); // Default parent name
    });

    test('internetGateway should not require resource name', () => {
      const name = cfLogicalNames.internetGateway();
      expect(name).toBeDefined();
      expect(name).toContain('InternetGateway');
    });

    test('deploymentBucket should not require resource name', () => {
      const name = cfLogicalNames.deploymentBucket();
      expect(name).toBeDefined();
      expect(name).toContain('Deployment');
      expect(name).toContain('Bucket');
    });

    test('ecrRepo should not require resource name', () => {
      const name = cfLogicalNames.ecrRepo();
      expect(name).toBeDefined();
      expect(name).toContain('Container');
      expect(name).toContain('Repository');
    });
  });

  describe('database resources', () => {
    test('dbInstance should generate logical name', () => {
      const name = cfLogicalNames.dbInstance('my-database');
      expect(name).toContain('DbInstance');
    });

    test('auroraDbCluster should generate logical name', () => {
      const name = cfLogicalNames.auroraDbCluster('my-cluster');
      expect(name).toContain('DbCluster');
    });

    test('dbReplica should include replica number', () => {
      const replica1 = cfLogicalNames.dbReplica('my-db', 1);
      const replica2 = cfLogicalNames.dbReplica('my-db', 2);
      expect(replica1).not.toBe(replica2);
      expect(replica1).toContain('Replica1');
      expect(replica2).toContain('Replica2');
    });

    test('dbSecurityGroup should generate logical name', () => {
      const name = cfLogicalNames.dbSecurityGroup('my-db');
      expect(name).toContain('SecurityGroup');
    });
  });

  describe('ECS resources', () => {
    test('ecsCluster should generate logical name', () => {
      const name = cfLogicalNames.ecsCluster('my-cluster');
      expect(name).toContain('Cluster');
    });

    test('ecsTaskDefinition should generate logical name', () => {
      const name = cfLogicalNames.ecsTaskDefinition('my-task');
      expect(name).toContain('TaskDefinition');
    });

    test('ecsService should generate logical name', () => {
      const name = cfLogicalNames.ecsService('my-service', false);
      expect(name).toContain('Service');
    });

    test('ecsTaskRole should generate logical name', () => {
      const name = cfLogicalNames.ecsTaskRole('my-service');
      expect(name).toContain('Role');
    });

    test('ecsLogGroup should include container name', () => {
      const name = cfLogicalNames.ecsLogGroup('my-service', 'app-container');
      expect(name).toContain('AppContainer');
      expect(name).toContain('LogGroup');
    });
  });

  describe('Redis resources', () => {
    test('redisReplicationGroup should generate logical name', () => {
      const name = cfLogicalNames.redisReplicationGroup('my-redis');
      expect(name).toContain('ReplicationGroup');
    });

    test('redisParameterGroup should generate logical name', () => {
      const name = cfLogicalNames.redisParameterGroup('my-redis');
      expect(name).toContain('ParameterGroup');
    });

    test('redisSubnetGroup should generate logical name', () => {
      const name = cfLogicalNames.redisSubnetGroup('my-redis');
      expect(name).toContain('SubnetGroup');
    });

    test('redisSecurityGroup should generate logical name', () => {
      const name = cfLogicalNames.redisSecurityGroup('my-redis');
      expect(name).toContain('SecurityGroup');
    });
  });

  describe('load balancer resources', () => {
    test('loadBalancer should generate logical name', () => {
      const name = cfLogicalNames.loadBalancer('my-lb');
      expect(name).toContain('LoadBalancer');
    });

    test('targetGroup should include load balancer name', () => {
      const name = cfLogicalNames.targetGroup({
        stpResourceName: 'my-service',
        loadBalancerName: 'my-lb',
        targetContainerPort: 8080
      });
      expect(name).toContain('MyLb');
      expect(name).toContain('ToPort8080');
    });

    test('targetGroup for blue-green deployment should include BG', () => {
      const name = cfLogicalNames.targetGroup({
        stpResourceName: 'my-service',
        loadBalancerName: 'my-lb',
        blueGreen: true
      });
      expect(name).toContain('Bg');
    });

    test('listener should include port', () => {
      const name = cfLogicalNames.listener(443, 'my-lb');
      expect(name).toContain('Port443');
      expect(name).toContain('Listener');
    });

    test('loadBalancerSecurityGroup should include Lb specifier', () => {
      const name = cfLogicalNames.loadBalancerSecurityGroup('my-lb');
      expect(name).toContain('Lb');
      expect(name).toContain('SecurityGroup');
    });
  });

  describe('HTTP API Gateway resources', () => {
    test('httpApi should generate logical name', () => {
      const name = cfLogicalNames.httpApi('my-api');
      expect(name).toContain('Api');
    });

    test('httpApiStage should generate logical name', () => {
      const name = cfLogicalNames.httpApiStage('my-api');
      expect(name).toContain('Stage');
    });

    test('httpApiRoute should include method and path', () => {
      const name = cfLogicalNames.httpApiRoute({
        stpResourceName: 'my-api',
        method: 'GET',
        path: '/users'
      });
      expect(name).toContain('Get');
      expect(name).toContain('Users');
      expect(name).toContain('Route');
    });

    test('httpApiRoute with wildcard method should use Any', () => {
      const name = cfLogicalNames.httpApiRoute({
        stpResourceName: 'my-api',
        method: '*',
        path: '/test'
      });
      expect(name).toContain('Any');
    });

    test('httpApiRoute with wildcard path should use Default', () => {
      const name = cfLogicalNames.httpApiRoute({
        stpResourceName: 'my-api',
        method: 'GET',
        path: '*'
      });
      expect(name).toContain('Default');
    });
  });

  describe('Batch resources', () => {
    test('batchComputeEnvironment should differentiate spot and on-demand', () => {
      const spot = cfLogicalNames.batchComputeEnvironment(true, false);
      const onDemand = cfLogicalNames.batchComputeEnvironment(false, false);
      expect(spot).not.toBe(onDemand);
      expect(spot).toContain('Spot');
      expect(onDemand).toContain('OnDemand');
    });

    test('batchComputeEnvironment should include GPU when specified', () => {
      const withGpu = cfLogicalNames.batchComputeEnvironment(false, true);
      const withoutGpu = cfLogicalNames.batchComputeEnvironment(false, false);
      expect(withGpu).not.toBe(withoutGpu);
      expect(withGpu).toContain('Gpu');
    });

    test('batchJobDefinition should generate logical name', () => {
      const name = cfLogicalNames.batchJobDefinition('my-job');
      expect(name).toContain('JobDefinition');
    });

    test('batchStateMachine should include JobExecution specifier', () => {
      const name = cfLogicalNames.batchStateMachine('my-job');
      expect(name).toContain('JobExecution');
      expect(name).toContain('StateMachine');
    });
  });

  describe('Cognito resources', () => {
    test('userPool should generate logical name', () => {
      const name = cfLogicalNames.userPool('my-pool');
      expect(name).toContain('UserPool');
    });

    test('userPoolClient should generate logical name', () => {
      const name = cfLogicalNames.userPoolClient('my-pool');
      expect(name).toContain('UserPoolClient');
    });

    test('userPoolDomain should generate logical name', () => {
      const name = cfLogicalNames.userPoolDomain('my-pool');
      expect(name).toContain('UserPoolDomain');
    });

    test('identityProvider should include provider type', () => {
      const google = cfLogicalNames.identityProvider('my-pool', 'google');
      const facebook = cfLogicalNames.identityProvider('my-pool', 'facebook');
      expect(google).not.toBe(facebook);
      expect(google).toContain('Google');
      expect(facebook).toContain('Facebook');
    });
  });

  describe('CloudWatch resources', () => {
    test('cloudwatchAlarm should remove underscores', () => {
      const name = cfLogicalNames.cloudwatchAlarm('my_alarm_name');
      expect(name).not.toContain('_');
      expect(name).toContain('Alarm');
    });

    test('sqsQueue should remove underscores', () => {
      const name = cfLogicalNames.sqsQueue('my_queue_name');
      expect(name).not.toContain('_');
      expect(name).toContain('Queue');
    });

    test('snsTopic should remove underscores', () => {
      const name = cfLogicalNames.snsTopic('my_topic_name');
      expect(name).not.toContain('_');
      expect(name).toContain('Topic');
    });
  });

  describe('Custom resources', () => {
    test('customResource should generate logical name', () => {
      const name = cfLogicalNames.customResource('my-resource');
      expect(name).toContain('CustomResource');
    });

    test('scriptCustomResource should include Script specifier', () => {
      const name = cfLogicalNames.scriptCustomResource('my-script');
      expect(name).toContain('Script');
      expect(name).toContain('CustomResource');
    });

    test('customResourceDefaultDomain should generate logical name', () => {
      const name = cfLogicalNames.customResourceDefaultDomain('my-api');
      expect(name).toContain('DefaultDomain');
    });

    test('customResourceEdgeLambda should generate logical name', () => {
      const name = cfLogicalNames.customResourceEdgeLambda('my-cdn');
      expect(name).toContain('EdgeLambda');
    });
  });

  describe('VPC resources', () => {
    test('vpcGatewayEndpoint should differentiate S3 and DynamoDB', () => {
      const s3 = cfLogicalNames.vpcGatewayEndpoint('s3');
      const dynamo = cfLogicalNames.vpcGatewayEndpoint('dynamo-db');
      expect(s3).not.toBe(dynamo);
      expect(s3).toContain('S3');
      expect(dynamo).toContain('DynamoDb');
    });

    test('natGateway should use index', () => {
      const nat0 = cfLogicalNames.natGateway(0);
      const nat1 = cfLogicalNames.natGateway(1);
      expect(nat0).not.toBe(nat1);
    });

    test('natElasticIp should include Nat specifier', () => {
      const name = cfLogicalNames.natElasticIp(0);
      expect(name).toContain('Nat');
      expect(name).toContain('Eip');
    });

    test('routeTable should differentiate public and private subnets', () => {
      const publicRT = cfLogicalNames.routeTable(true, 0);
      const privateRT = cfLogicalNames.routeTable(false, 0);
      expect(publicRT).not.toBe(privateRT);
      expect(publicRT).toContain('PublicSubnet');
      expect(privateRT).toContain('PrivateSubnet');
    });
  });

  describe('Lambda permissions', () => {
    test('lambdaPermission should include event index', () => {
      const perm0 = cfLogicalNames.lambdaPermission('my-function', 0);
      const perm1 = cfLogicalNames.lambdaPermission('my-function', 1);
      expect(perm0).not.toBe(perm1);
      expect(perm0).toContain('Event0');
    });

    test('lambdaPublicUrlPermission should include PublicUrl specifier', () => {
      const name = cfLogicalNames.lambdaPublicUrlPermission('my-function');
      expect(name).toContain('PublicUrl');
      expect(name).toContain('Permission');
    });

    test('lambdaTargetGroupPermission should include load balancer name', () => {
      const name = cfLogicalNames.lambdaTargetGroupPermission('my-function', 'my-lb');
      expect(name).toContain('MyLb');
      expect(name).toContain('TargetGroup');
    });
  });

  describe('auto scaling resources', () => {
    test('autoScalingTarget should generate logical name', () => {
      const name = cfLogicalNames.autoScalingTarget('my-service');
      expect(name).toContain('ScalableTarget');
    });

    test('autoScalingPolicy should include metric', () => {
      const cpu = cfLogicalNames.autoScalingPolicy('my-service', 'cpu');
      const memory = cfLogicalNames.autoScalingPolicy('my-service', 'memory');
      expect(cpu).not.toBe(memory);
      expect(cpu).toContain('Cpu');
      expect(memory).toContain('Memory');
    });

    test('dynamoAutoScalingTarget should include metric', () => {
      const name = cfLogicalNames.dynamoAutoScalingTarget('my-table', 'readCapacity');
      expect(name).toContain('ReadCapacity');
    });
  });

  describe('naming consistency', () => {
    test('should generate consistent names for same input', () => {
      const name1 = cfLogicalNames.lambda('my-function');
      const name2 = cfLogicalNames.lambda('my-function');
      expect(name1).toBe(name2);
    });

    test('should generate different names for different inputs', () => {
      const name1 = cfLogicalNames.lambda('function-1');
      const name2 = cfLogicalNames.lambda('function-2');
      expect(name1).not.toBe(name2);
    });

    test('all names should be PascalCase', () => {
      const names = [
        cfLogicalNames.lambda('my-function'),
        cfLogicalNames.bucket('my-bucket'),
        cfLogicalNames.dynamoGlobalTable('my-table'),
        cfLogicalNames.vpc(),
        cfLogicalNames.internetGateway()
      ];
      names.forEach((name) => {
        expect(name).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      });
    });
  });
});
