import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { DIST_FOLDER_PATH, JSON_SCHEMAS_FOLDER_PATH } from 'src/config/project-paths';
import { fsPaths } from 'src/config/runtime-paths';
import { stacktapeCloudfrontHeaders } from 'src/helper-lambda-contracts/cloudfront-headers';
import { resourceURIs } from 'src/utils/aws-resource-uris';
import { cfRegistryNames } from '@domain-services/cloudformation-registry-manager/names';
import { resourceReferencableParams } from '@domain-services/config-manager/resource-reference-parameters';
import {
  buildLambdaS3Key,
  buildLayerS3Key,
  getCfTemplateS3Key,
  getCloudformationTemplateUrl,
  getEcrImageTag,
  getEcrImageUrl,
  getEcrRepositoryUrl,
  getStpTemplateS3Key
} from '@domain-services/deployment-artifact-manager/artifact-names';
import {
  getAlarmDescription,
  getCustomAlarmDescription
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/alarms/descriptions';

describe('CLI-owned names, paths and wire identifiers', () => {
  test('preserves project and invocation paths', () => {
    expect(DIST_FOLDER_PATH).toBe(join(process.cwd(), '__stacktape-dist'));
    expect(JSON_SCHEMAS_FOLDER_PATH).toBe(join(process.cwd(), '@generated', 'schemas'));
    expect(fsPaths.absoluteTempFolderPath({ invocationId: 'inv-123' })).toBe(
      join(process.cwd(), '.stacktape', 'inv-123')
    );
    expect(fsPaths.absoluteBuildFolderPath({ invocationId: 'inv-123' })).toBe(
      join(process.cwd(), '.stacktape', 'inv-123', 'build')
    );
  });

  test('preserves deployment artifact keys and URLs', () => {
    expect(getEcrImageTag('api', 'v4', 'abc123')).toBe('api--abc123--v4');
    expect(getEcrImageUrl('123.dkr.ecr.eu-west-1.amazonaws.com/api', 'latest')).toBe(
      '123.dkr.ecr.eu-west-1.amazonaws.com/api:latest'
    );
    expect(getEcrRepositoryUrl('123', 'eu-west-1', 'api')).toBe('123.dkr.ecr.eu-west-1.amazonaws.com/api');
    expect(getCfTemplateS3Key('v4')).toBe('cf-template/v4.yml');
    expect(getStpTemplateS3Key('v4')).toBe('stp-template/v4.yml');
    expect(buildLambdaS3Key('api', 'v4', 'abc123')).toBe('api/v4-abc123.zip');
    expect(buildLayerS3Key(2, 'v4', 'abc123')).toBe('shared-layer-2/v4-abc123.zip');
    expect(getCloudformationTemplateUrl('deployments', 'cn-north-1', 'v4')).toBe(
      'https://deployments.s3.cn-north-1.amazonaws.com.cn/cf-template/v4.yml'
    );
  });

  test('preserves helper-Lambda and CloudFormation registry contracts', () => {
    expect({
      originResponse: stacktapeCloudfrontHeaders.setOriginResponseHeaders(),
      spa: stacktapeCloudfrontHeaders.spaHeader(),
      normalizeUrl: stacktapeCloudfrontHeaders.urlOptimization(),
      rewriteHost: stacktapeCloudfrontHeaders.rewriteHostHeader(),
      originType: stacktapeCloudfrontHeaders.originType()
    }).toEqual({
      originResponse: 'X-Stp-Origin-Response-Set-Headers',
      spa: 'X-Stp-Origin-Request-SPA',
      normalizeUrl: 'X-Stp-Origin-Request-Url-Normalization',
      rewriteHost: 'X-Stp-Origin-Request-Rewrite-Host',
      originType: 'X-Stp-Origin-Request-Origin-Type'
    });
    expect(cfRegistryNames.buildRoleNameFromPackagePrefix({ packagePrefix: 'mongo', region: 'eu-west-1' })).toBe(
      'stp-mongo-eu-west-1'
    );
    expect(cfRegistryNames.buildZipPackageNameFromPackagePrefix({ packagePrefix: 'mongo' })).toBe('mongo.zip');
    expect(resourceReferencableParams.redisSharding()).toBe('sharding');
    expect(resourceURIs.bucket({ bucketName: 'assets', region: 'eu-west-1' })).toBe(
      'assets.s3.eu-west-1.amazonaws.com'
    );
  });

  test('preserves generated alarm descriptions', () => {
    expect(
      getAlarmDescription({
        triggerType: 'lambda-error-rate',
        threshold: 5,
        comparisonOperator: 'GreaterThanThreshold',
        stpResourceName: 'api',
        stackName: 'my-project-dev',
        statFunction: 'Average'
      })
    ).toBe(
      'Monitors Average lambda-error-rate of api in stack my-project-dev. Triggered when GreaterThanThreshold (5).'
    );
    expect(
      getCustomAlarmDescription({
        metricName: 'QueueDepth',
        threshold: 10,
        comparisonOperator: 'GreaterThanOrEqualToThreshold',
        stpResourceName: 'jobs',
        stackName: 'my-project-dev'
      })
    ).toBe('Monitors QueueDepth of jobs in stack my-project-dev. Triggered when GreaterThanOrEqualToThreshold (10).');
  });
});
