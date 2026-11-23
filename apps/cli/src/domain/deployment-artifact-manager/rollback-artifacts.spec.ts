import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
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

// After fast deployments, CloudFormation still runs the template of the last full deployment. A later update that fails
// rolls the function code back to the objects that template names, so retention must not delete them.
test('retention keeps the artifacts of the template CloudFormation runs', () => {
  const versions = Array.from({ length: 30 }, (_, index) => `v${String(index + 1).padStart(6, '0')}`);
  manager.previousObjects = versions.map((version) => ({
    name: 'api',
    version,
    digest: `digest-${version}`,
    type: 'user-lambda',
    s3Key: `api/${version}-digest-${version}.zip`
  }));
  manager.previousImages = versions.map((version) => ({
    name: 'web',
    version,
    digest: `digest-${version}`,
    tag: `web--digest-${version}--${version}`,
    dockerDigest: `sha256:${version}`
  }));
  const deployedTemplate = templateManager.oldTemplate;
  templateManager.oldTemplate = {
    Resources: {
      Api: {
        Type: 'AWS::Lambda::Function',
        Properties: { Code: { S3Bucket: 'deployment-bucket', S3Key: 'api/v000001-digest-v000001.zip' } }
      },
      Task: {
        Type: 'AWS::ECS::TaskDefinition',
        Properties: { ContainerDefinitions: [{ Name: 'web', Image: `${repository}:web--digest-v000001--v000001` }] }
      }
    }
  } as unknown as CloudFormationTemplate;
  const config = {
    deploymentConfig: { previousVersionsToKeep: 25 },
    allContainersRequiringPackaging: [],
    agentCoreRuntimesRequiringPackaging: []
  };
  for (const [key, value] of Object.entries(config))
    Object.defineProperty(configManager, key, { configurable: true, value });
  try {
    const obsoleteObjects = manager.getObsoleteItems(manager.previousObjects).map(({ version }) => version);
    const obsoleteImages = manager.getObsoleteItems(manager.previousImages).map(({ version }) => version);
    // 1 + 25 versions stay; of the four older ones, the template still names v000001.
    expect(obsoleteObjects).toEqual(['v000002', 'v000003', 'v000004']);
    expect(obsoleteImages).toEqual(['v000002', 'v000003', 'v000004']);
  } finally {
    // The own properties shadowed the class getters; removing them restores those.
    for (const key of Object.keys(config)) delete (configManager as unknown as Record<string, unknown>)[key];
    templateManager.oldTemplate = deployedTemplate;
  }
});
