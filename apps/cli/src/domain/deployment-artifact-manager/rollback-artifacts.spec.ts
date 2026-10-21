import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { tuiManager } from '@application-services/tui-manager';
import { deploymentArtifactManager as manager } from './index';
import { CLOUD_MAP_DRAIN_IMAGES, cloudMapDrainImageTag } from './cloud-map-drain-image';
import { getCfTemplateS3Key } from './artifact-names';

let template: CloudFormationTemplate;
const repository = '123456789012.dkr.ecr.eu-west-1.amazonaws.com/deployment';
let restore: ReturnType<typeof spyOn<typeof awsSdkManager.ecr, 'copyPublicImage'>>;
let warning: ReturnType<typeof spyOn<typeof tuiManager, 'warn'>>;
let readTemplate: ReturnType<typeof spyOn<typeof manager, 'getTemplate'>>;

beforeEach(() => {
  awsSdkManager.init({ credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, region: 'eu-west-1' });
  manager.repositoryName = 'deployment';
  manager.repositoryUrl = repository;
  manager.deploymentBucketName = 'deployment-bucket';
  manager.previousImages = [];
  manager.previousObjects = [
    { name: 'cf-template', version: 'v000001', digest: '', type: 'cf-template', s3Key: getCfTemplateS3Key('v000001') }
  ];
  template = { Resources: {} } as CloudFormationTemplate;
  readTemplate = spyOn(manager, 'getTemplate').mockImplementation(async () => template);
  restore = spyOn(awsSdkManager.ecr, 'copyPublicImage').mockResolvedValue(undefined);
  warning = spyOn(tuiManager, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  readTemplate.mockRestore();
  restore.mockRestore();
  warning.mockRestore();
});

const task = (image: string) => {
  template.Resources.ApiTask = {
    Type: 'AWS::ECS::TaskDefinition',
    Properties: { ContainerDefinitions: [{ Name: 'app', Image: image }] }
  };
};

test.each(Object.values(CLOUD_MAP_DRAIN_IMAGES))(
  'restores missing pinned drain image %s before allowing rollback',
  async (digest) => {
    task(`${repository}@${digest}`);
    await manager.verifyArtifactsForVersion('v000001');
    expect(restore).toHaveBeenCalledWith({
      repositoryName: 'deployment',
      sourceRepository: 'docker/library/busybox',
      digest,
      tag: cloudMapDrainImageTag(digest)
    });
    expect(warning).not.toHaveBeenCalled();
  }
);

test('does not copy a drain image already present by digest', async () => {
  const digest = CLOUD_MAP_DRAIN_IMAGES.amd64;
  task(`${repository}@${digest}`);
  manager.previousImages = [
    { name: '', version: '', digest: '', tag: cloudMapDrainImageTag(digest), dockerDigest: digest }
  ];
  await manager.verifyArtifactsForVersion('v000001');
  expect(restore).not.toHaveBeenCalled();
  expect(warning).not.toHaveBeenCalled();
});

test.each([':app--hash--v000001', '@sha256:' + 'a'.repeat(64)])(
  'warns and permits missing ECS image %s',
  async (suffix) => {
    const image = `${repository}${suffix}`;
    task(image);
    await manager.verifyArtifactsForVersion('v000001');
    expect(restore).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining(`Rollback service ApiTask, container app: image ${image}`)
    );
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('will fail to start'));
  }
);

test('failed drain recovery warns and leaves the emergency rollback available', async () => {
  task(`${repository}@${CLOUD_MAP_DRAIN_IMAGES.arm64}`);
  restore.mockRejectedValue(new Error('registry unavailable'));
  await manager.verifyArtifactsForVersion('v000001');
  expect(warning).toHaveBeenCalledWith(expect.stringContaining('registry unavailable'));
  expect(warning).toHaveBeenCalledWith(expect.stringContaining('will fail to start'));
});

test('missing Lambda images still refuse rollback, even for a known drain digest', async () => {
  const image = `${repository}@${CLOUD_MAP_DRAIN_IMAGES.amd64}`;
  template.Resources.ApiFunction = { Type: 'AWS::Lambda::Function', Properties: { Code: { ImageUri: image } } };
  await expect(manager.verifyArtifactsForVersion('v000001')).rejects.toThrow('cannot be restored');
  expect(restore).not.toHaveBeenCalled();
});
