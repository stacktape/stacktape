import { afterEach, expect, test } from 'bun:test';
import { deploymentArtifactManager } from './index';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { globalStateManager } from '@application-services/global-state-manager';

const environment = { ...process.env };
afterEach(() => {
  for (const name of ['AWS_ENDPOINT_URL', 'AWS_ENDPOINT_URL_S3', 'AWS_IGNORE_CONFIGURED_ENDPOINT_URLS']) {
    if (environment[name] === undefined) delete process.env[name];
    else process.env[name] = environment[name];
  }
});

const templateUrl = () => {
  deploymentArtifactManager.deploymentBucketName = 'deployment-bucket';
  stackManager.existingStackDetails = undefined;
  return deploymentArtifactManager.cloudformationTemplateUrl;
};

test.each([
  ['eu-west-1', 'https://deployment-bucket.s3.eu-west-1.amazonaws.com/cf-template/v000001.yml'],
  ['cn-north-1', 'https://deployment-bucket.s3.cn-north-1.amazonaws.com.cn/cf-template/v000001.yml'],
  ['us-gov-west-1', 'https://deployment-bucket.s3-us-gov-west-1.amazonaws.com/cf-template/v000001.yml']
])('preserves the exact AWS template URL for %s', (region, expected) => {
  delete process.env.AWS_ENDPOINT_URL;
  delete process.env.AWS_ENDPOINT_URL_S3;
  globalStateManager.rawArgs = { region: region as typeof globalStateManager.region };
  expect(templateUrl()).toBe(expected);
});

test.each(['http://127.0.0.1:4566', 'http://localhost:4566/', 'http://[::1]:4566/base/'])(
  'uses path-style template URLs with the global endpoint %s',
  (endpoint) => {
    delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
    process.env.AWS_ENDPOINT_URL = endpoint;
    delete process.env.AWS_ENDPOINT_URL_S3;
    expect(templateUrl()).toBe(`${endpoint.replace(/\/$/, '')}/deployment-bucket/cf-template/v000001.yml`);
  }
);

test('a rollback or diff of another version uses the same local endpoint as a deploy', () => {
  delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
  process.env.AWS_ENDPOINT_URL = 'http://127.0.0.1:4566';
  delete process.env.AWS_ENDPOINT_URL_S3;
  deploymentArtifactManager.deploymentBucketName = 'deployment-bucket';
  expect(deploymentArtifactManager.getCloudformationTemplateUrlForVersion('v000007')).toBe(
    'http://127.0.0.1:4566/deployment-bucket/cf-template/v000007.yml'
  );
  delete process.env.AWS_ENDPOINT_URL;
  globalStateManager.rawArgs = { region: 'eu-west-1' };
  expect(deploymentArtifactManager.getCloudformationTemplateUrlForVersion('v000007')).toBe(
    'https://deployment-bucket.s3.eu-west-1.amazonaws.com/cf-template/v000007.yml'
  );
});

test('the S3 endpoint overrides the global endpoint, including its path prefix', () => {
  delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
  process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
  process.env.AWS_ENDPOINT_URL_S3 = 'http://127.0.0.1:9000/s3/';
  expect(templateUrl()).toBe('http://127.0.0.1:9000/s3/deployment-bucket/cf-template/v000001.yml');
  delete process.env.AWS_ENDPOINT_URL;
  expect(templateUrl()).toBe('http://127.0.0.1:9000/s3/deployment-bucket/cf-template/v000001.yml');
});

test.each(['https://s3.proxy.internal', 'https://bucket.vpce-0123.s3.eu-west-1.vpce.amazonaws.com'])(
  'keeps the AWS template URL when the S3 endpoint override %s is not a local emulator',
  (endpoint) => {
    delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    process.env.AWS_ENDPOINT_URL_S3 = endpoint;
    expect(templateUrl()).toBe('https://deployment-bucket.s3.eu-west-1.amazonaws.com/cf-template/v000001.yml');
  }
);

test('keeps the AWS template URL when configured endpoints are ignored', () => {
  globalStateManager.rawArgs = { region: 'eu-west-1' };
  process.env.AWS_ENDPOINT_URL = 'http://127.0.0.1:4566';
  process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'true';
  expect(templateUrl()).toBe('https://deployment-bucket.s3.eu-west-1.amazonaws.com/cf-template/v000001.yml');
});
