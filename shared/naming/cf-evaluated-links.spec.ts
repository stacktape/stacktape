import { Ref } from '@cloudform/functions';
import { describe, expect, test } from 'bun:test';
import { cfEvaluatedLinks } from './cf-evaluated-links';

describe('cf-evaluated-links', () => {
  describe('ecsMonitoring', () => {
    test('should generate ECS monitoring link with string inputs', () => {
      const link = cfEvaluatedLinks.ecsMonitoring('my-cluster', 'my-service');
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('my-cluster');
      expect(JSON.stringify(link)).toContain('my-service');
      expect(JSON.stringify(link)).toContain('ecs');
      expect(JSON.stringify(link)).toContain('metrics');
    });

    test('should generate ECS monitoring link with intrinsic functions', () => {
      const link = cfEvaluatedLinks.ecsMonitoring(Ref('ClusterName'), Ref('ServiceName'));
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('Ref');
    });
  });

  describe('stateMachineExecutions', () => {
    test('should generate state machine executions link', () => {
      const arn = 'arn:aws:states:us-east-1:123456789012:stateMachine:MyStateMachine';
      const link = cfEvaluatedLinks.stateMachineExecutions(arn);
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('states');
      expect(JSON.stringify(link)).toContain('statemachines');
    });

    test('should handle intrinsic function for state machine ARN', () => {
      const link = cfEvaluatedLinks.stateMachineExecutions(Ref('StateMachineArn'));
      expect(link).toBeDefined();
    });
  });

  describe('ec2InstancesOfAsg', () => {
    test('should generate EC2 instances link for ASG', () => {
      const link = cfEvaluatedLinks.ec2InstancesOfAsg('my-asg');
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('ec2');
      expect(JSON.stringify(link)).toContain('Instances');
    });

    test('should include tag filter in link', () => {
      const link = cfEvaluatedLinks.ec2InstancesOfAsg('my-asg');
      expect(JSON.stringify(link)).toContain('tag');
    });
  });

  describe('logGroup', () => {
    test('should generate log group link with double encoding', () => {
      const link = cfEvaluatedLinks.logGroup('/aws/lambda/my-function');
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('cloudwatch');
      expect(JSON.stringify(link)).toContain('logsV2');
    });

    test('should handle log group name with special characters', () => {
      const link = cfEvaluatedLinks.logGroup('/aws/ecs/my-service/container');
      expect(link).toBeDefined();
    });

    test('should allow optional region parameter', () => {
      const link1 = cfEvaluatedLinks.logGroup('/aws/lambda/fn');
      const link2 = cfEvaluatedLinks.logGroup('/aws/lambda/fn', 'us-west-2');
      expect(link1).toBeDefined();
      expect(link2).toBeDefined();
    });
  });

  describe('lambda', () => {
    test('should generate Lambda link with basic parameters', () => {
      const link = cfEvaluatedLinks.lambda({
        awsLambdaName: 'my-function',
        tab: 'monitoring'
      });
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('lambda');
      expect(JSON.stringify(link)).toContain('functions');
      expect(JSON.stringify(link)).toContain('monitoring');
    });

    test('should include alias in link when provided', () => {
      const link = cfEvaluatedLinks.lambda({
        awsLambdaName: 'my-function',
        tab: 'code',
        alias: 'prod'
      });
      expect(JSON.stringify(link)).toContain('aliases');
      expect(JSON.stringify(link)).toContain('prod');
    });

    test('should support different tabs', () => {
      const tabs = ['code', 'monitoring', 'configuration', 'aliases'];
      tabs.forEach((tab) => {
        const link = cfEvaluatedLinks.lambda({
          awsLambdaName: 'my-function',
          tab
        });
        expect(JSON.stringify(link)).toContain(tab);
      });
    });

    test('should handle intrinsic function for Lambda name', () => {
      const link = cfEvaluatedLinks.lambda({
        awsLambdaName: Ref('LambdaName'),
        tab: 'monitoring'
      });
      expect(link).toBeDefined();
    });
  });

  describe('loadBalancers', () => {
    test('should generate load balancer link', () => {
      const arn = 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-lb/1234567890';
      const link = cfEvaluatedLinks.loadBalancers({
        lbArn: arn,
        tab: 'listeners'
      });
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('ec2');
      expect(JSON.stringify(link)).toContain('LoadBalancer');
      expect(JSON.stringify(link)).toContain('listeners');
    });

    test('should support different tabs', () => {
      const tabs = ['listeners', 'targets', 'monitoring'];
      tabs.forEach((tab) => {
        const link = cfEvaluatedLinks.loadBalancers({
          lbArn: 'arn:aws:lb',
          tab
        });
        expect(JSON.stringify(link)).toContain(tab);
      });
    });
  });

  describe('httpApiGateway', () => {
    test('should generate HTTP API Gateway link', () => {
      const link = cfEvaluatedLinks.httpApiGateway({ apiId: 'abc123def' });
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('apigateway');
      expect(JSON.stringify(link)).toContain('api-detail');
    });

    test('should include region substitution', () => {
      const link = cfEvaluatedLinks.httpApiGateway({ apiId: 'xyz789' });
      expect(JSON.stringify(link)).toContain('AWS::Region');
    });
  });

  describe('efsFilesystem', () => {
    test('should generate EFS filesystem link', () => {
      const link = cfEvaluatedLinks.efsFilesystem({ filesystemId: 'fs-12345678' });
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('efs');
      expect(JSON.stringify(link)).toContain('file-systems');
      expect(JSON.stringify(link)).toContain('tabId=size');
    });

    test('should handle different filesystem IDs', () => {
      const ids = ['fs-abc123', 'fs-xyz789', 'fs-00000000'];
      ids.forEach((id) => {
        const link = cfEvaluatedLinks.efsFilesystem({ filesystemId: id });
        expect(JSON.stringify(link)).toContain(id);
      });
    });
  });

  describe('redisClusterMonitoring', () => {
    test('should generate Redis cluster link without shard number', () => {
      const link = cfEvaluatedLinks.redisClusterMonitoring('my-redis', 2);
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('elasticache');
      expect(JSON.stringify(link)).toContain('redis-group-nodes');
    });

    test('should generate Redis cluster link with shard number', () => {
      const link = cfEvaluatedLinks.redisClusterMonitoring('my-redis', 2, 1);
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('redis-cluster-nodes');
    });

    test('should calculate correct number of nodes (replicas + 1)', () => {
      const link = cfEvaluatedLinks.redisClusterMonitoring('my-redis', 3);
      const linkStr = JSON.stringify(link);
      // With 3 replicas, we should have 4 nodes total
      expect(linkStr).toContain('001');
      expect(linkStr).toContain('004');
    });

    test('should pad shard numbers correctly', () => {
      const link = cfEvaluatedLinks.redisClusterMonitoring('my-redis', 1, 5);
      const linkStr = JSON.stringify(link);
      expect(linkStr).toContain('0005'); // Shard number padded to 4 digits
    });

    test('should pad node numbers correctly', () => {
      const link = cfEvaluatedLinks.redisClusterMonitoring('my-redis', 0, 1);
      const linkStr = JSON.stringify(link);
      expect(linkStr).toContain('001'); // Node number padded to 3 digits
    });
  });

  describe('relationalDatabase', () => {
    test('should generate RDS instance link', () => {
      const link = cfEvaluatedLinks.relationalDatabase('my-db-instance', false, 'monitoring');
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('rds');
      expect(JSON.stringify(link)).toContain('database');
      expect(JSON.stringify(link)).toContain('is-cluster=false');
      expect(JSON.stringify(link)).toContain('monitoring');
    });

    test('should generate RDS cluster link', () => {
      const link = cfEvaluatedLinks.relationalDatabase('my-db-cluster', true, 'connectivity');
      expect(JSON.stringify(link)).toContain('is-cluster=true');
      expect(JSON.stringify(link)).toContain('connectivity');
    });

    test('should support different tabs', () => {
      const tabs = ['monitoring', 'connectivity', 'configuration', 'logs'];
      tabs.forEach((tab) => {
        const link = cfEvaluatedLinks.relationalDatabase('my-db', false, tab);
        expect(JSON.stringify(link)).toContain(tab);
      });
    });
  });

  describe('dynamoTable', () => {
    test('should generate DynamoDB table link', () => {
      const link = cfEvaluatedLinks.dynamoTable('my-table', 'overview');
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('dynamodbv2');
      expect(JSON.stringify(link)).toContain('table');
      expect(JSON.stringify(link)).toContain('overview');
    });

    test('should support different tabs', () => {
      const tabs = ['overview', 'items', 'metrics', 'indexes'];
      tabs.forEach((tab) => {
        const link = cfEvaluatedLinks.dynamoTable('my-table', tab);
        expect(JSON.stringify(link)).toContain(tab);
      });
    });
  });

  describe('dynamoItems', () => {
    test('should generate DynamoDB items explorer link', () => {
      const link = cfEvaluatedLinks.dynamoItems('my-table');
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('dynamodbv2');
      expect(JSON.stringify(link)).toContain('item-explorer');
    });

    test('should handle different table names', () => {
      const names = ['users-table', 'orders-table', 'products-table'];
      names.forEach((name) => {
        const link = cfEvaluatedLinks.dynamoItems(name);
        expect(JSON.stringify(link)).toContain(name);
      });
    });
  });

  describe('s3Bucket', () => {
    test('should generate S3 bucket link', () => {
      const link = cfEvaluatedLinks.s3Bucket('my-bucket', 'objects');
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('s3');
      expect(JSON.stringify(link)).toContain('buckets');
      expect(JSON.stringify(link)).toContain('objects');
    });

    test('should include region reference', () => {
      const link = cfEvaluatedLinks.s3Bucket('my-bucket', 'properties');
      expect(JSON.stringify(link)).toContain('AWS::Region');
    });

    test('should support different tabs', () => {
      const tabs = ['objects', 'properties', 'permissions', 'metrics'];
      tabs.forEach((tab) => {
        const link = cfEvaluatedLinks.s3Bucket('my-bucket', tab);
        expect(JSON.stringify(link)).toContain(tab);
      });
    });
  });

  describe('cloudwatchAlarm', () => {
    test('should generate CloudWatch alarm link', () => {
      const link = cfEvaluatedLinks.cloudwatchAlarm('my-alarm');
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('cloudwatch');
      expect(JSON.stringify(link)).toContain('alarmsV2');
    });

    test('should handle different alarm names', () => {
      const names = ['high-cpu-alarm', 'low-memory-alarm', 'error-rate-alarm'];
      names.forEach((name) => {
        const link = cfEvaluatedLinks.cloudwatchAlarm(name);
        expect(JSON.stringify(link)).toContain(name);
      });
    });
  });

  describe('firewall', () => {
    test('should generate WAF firewall link', () => {
      const link = cfEvaluatedLinks.firewall({
        region: 'us-east-1',
        awsWebACLName: 'my-web-acl',
        awsWebACLId: Ref('WebACLId')
      });
      expect(link).toBeDefined();
      expect(JSON.stringify(link)).toContain('wafv2');
      expect(JSON.stringify(link)).toContain('my-web-acl');
      expect(JSON.stringify(link)).toContain('us-east-1');
    });

    test('should use us-east-1 console URL', () => {
      const link = cfEvaluatedLinks.firewall({
        region: 'eu-west-1',
        awsWebACLName: 'test-acl',
        awsWebACLId: Ref('WebACLId')
      });
      // Even for eu-west-1 resources, WAF console is in us-east-1
      expect(JSON.stringify(link)).toContain('us-east-1.console');
    });

    test('should include web ACL overview path', () => {
      const link = cfEvaluatedLinks.firewall({
        region: 'us-west-2',
        awsWebACLName: 'my-acl',
        awsWebACLId: Ref('WebACLId')
      });
      expect(JSON.stringify(link)).toContain('overview');
      expect(JSON.stringify(link)).toContain('web-acl');
    });
  });
});
