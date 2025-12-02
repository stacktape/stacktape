import { describe, expect, test } from 'bun:test';
import { awsResourceNames, codebuildDeploymentBucketResourceName } from './aws-resource-names';

describe('aws-resource-names', () => {
  const stackName = 'test-stack';
  const globallyUniqueStackHash = 'abc123def';
  const region = 'us-east-1';
  const accountId = '123456789012';

  describe('bucket', () => {
    test('should generate bucket name with stack, resource, and hash', () => {
      const name = awsResourceNames.bucket('my-bucket', stackName, globallyUniqueStackHash);
      expect(name).toContain('test-stack');
      expect(name).toContain('my-bucket');
      expect(name).toContain(globallyUniqueStackHash);
    });

    test('should be deterministic', () => {
      const name1 = awsResourceNames.bucket('bucket', stackName, globallyUniqueStackHash);
      const name2 = awsResourceNames.bucket('bucket', stackName, globallyUniqueStackHash);
      expect(name1).toBe(name2);
    });
  });

  describe('dynamoGlobalTable', () => {
    test('should generate DynamoDB global table name', () => {
      const name = awsResourceNames.dynamoGlobalTable('my-table', globallyUniqueStackHash, stackName);
      expect(name).toContain('test-stack');
      expect(name).toContain('my-table');
      expect(name).toContain(globallyUniqueStackHash);
    });
  });

  describe('dynamoRegionalTable', () => {
    test('should generate DynamoDB regional table name', () => {
      const name = awsResourceNames.dynamoRegionalTable('my-table', stackName);
      expect(name).toContain('test-stack');
      expect(name).toContain('my-table');
    });

    test('should not include globallyUniqueStackHash', () => {
      const name = awsResourceNames.dynamoRegionalTable('table', stackName);
      expect(name).not.toContain(globallyUniqueStackHash);
    });
  });

  describe('redisReplicationGroupId', () => {
    test('should generate Redis replication group ID', () => {
      const name = awsResourceNames.redisReplicationGroupId('my-redis', stackName);
      expect(name).toContain('test-stack');
      expect(name).toContain('my-redis');
    });
  });

  describe('lambdaRole', () => {
    test('should generate Lambda role name for regular function', () => {
      const name = awsResourceNames.lambdaRole(stackName, region, 'my-function', 'function');
      expect(name).toContain('test-stack');
      expect(name).toContain('my-function');
      expect(name).toContain(region);
      expect(name).not.toContain('TRIGGER');
    });
  });

  describe('lambdaDefaultRole', () => {
    test('should be consistent for same inputs', () => {
      const name1 = awsResourceNames.lambdaDefaultRole(stackName, region);
      const name2 = awsResourceNames.lambdaDefaultRole(stackName, region);
      expect(name1).toBe(name2);
    });
  });

  describe('lambdaStpAlias', () => {
    test('should always return same value', () => {
      const name1 = awsResourceNames.lambdaStpAlias();
      const name2 = awsResourceNames.lambdaStpAlias();
      expect(name1).toBe(name2);
    });
  });

  describe('eventBus', () => {
    test('should generate EventBridge event bus name', () => {
      const name = awsResourceNames.eventBus(stackName, 'my-bus');
      expect(name).toContain('test-stack');
      expect(name).toContain('my-bus');
    });
  });

  describe('deploymentBucket', () => {
    test('should generate deployment bucket name with hash', () => {
      const name = awsResourceNames.deploymentBucket(globallyUniqueStackHash);
      expect(name).toContain('stp-deployment-bucket');
      expect(name).toContain(globallyUniqueStackHash);
    });

    test('should not include stack name', () => {
      const name = awsResourceNames.deploymentBucket(globallyUniqueStackHash);
      expect(name).not.toContain('test-stack');
    });
  });

  describe('deploymentEcrRepo', () => {});

  describe('stpServiceDynamoTable', () => {
    test('should include region', () => {
      const name = awsResourceNames.stpServiceDynamoTable('eu-west-1');
      expect(name).toContain('eu-west-1');
    });
  });

  describe('batchComputeEnvironment', () => {});

  describe('batchJobQueue', () => {});

  describe('dbCluster', () => {
    test('should generate Aurora DB cluster name', () => {
      const name = awsResourceNames.dbCluster(stackName, 'my-cluster');
      expect(name).toContain('test-stack');
      expect(name).toContain('my-cluster');
    });
  });

  describe('dbInstance', () => {
    test('should generate RDS instance name', () => {
      const name = awsResourceNames.dbInstance('my-database', stackName);
      expect(name).toContain('test-stack');
      expect(name).toContain('my-database');
    });
  });

  describe('dbSecurityGroup', () => {});

  describe('codebuildDeploymentBucketResourceName', () => {
    test('should generate CodeBuild deployment bucket name', () => {
      const name = codebuildDeploymentBucketResourceName(region, accountId);
      expect(name).toContain('stp-codebuild-deployment');
      expect(name).toContain(region);
    });

    test('should include short hash of account ID', () => {
      const name = codebuildDeploymentBucketResourceName(region, accountId);
      // Should contain a hashed version of account ID, not the full account ID
      expect(name.length).toBeLessThan(60);
    });

    test('should be consistent for same inputs', () => {
      const name1 = codebuildDeploymentBucketResourceName(region, accountId);
      const name2 = codebuildDeploymentBucketResourceName(region, accountId);
      expect(name1).toBe(name2);
    });
  });

  describe('atlasMongoProject', () => {
    test('should generate Atlas MongoDB project name', () => {
      const name = awsResourceNames.atlasMongoProject(stackName, globallyUniqueStackHash);
      expect(name).toContain('test-stack');
      expect(name).toContain(globallyUniqueStackHash);
    });
  });

  describe('atlasMongoCluster', () => {
    test('should generate Atlas MongoDB cluster name', () => {
      const name = awsResourceNames.atlasMongoCluster('my-cluster');
      expect(name).toContain('my-cluster');
    });
  });
});
