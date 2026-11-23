import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { operationReporter } from '@application-services/operation-manager';
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

describe('cleanup keeps the artifacts in use', () => {
  const versions = Array.from({ length: 30 }, (_, index) => `v${String(index + 1).padStart(6, '0')}`);
  const objectKey = (version: string) => `api/${version}-digest-${version}.zip`;
  const imageTag = (version: string) => `web--digest-${version}--${version}`;
  const templateNaming = ({ object, image }: { object?: string; image?: string }) =>
    ({
      Resources: {
        ...(object && {
          Api: { Type: 'AWS::Lambda::Function', Properties: { Code: { S3Bucket: 'deployment-bucket', S3Key: object } } }
        }),
        ...(image && {
          Task: {
            Type: 'AWS::ECS::TaskDefinition',
            Properties: { ContainerDefinitions: [{ Name: 'web', Image: image }] }
          }
        })
      }
    }) as unknown as CloudFormationTemplate;
  const config = {
    deploymentConfig: { previousVersionsToKeep: 25 },
    allContainersRequiringPackaging: [],
    agentCoreRuntimesRequiringPackaging: []
  };
  let deployedTemplate: CloudFormationTemplate;
  let deletedImages: string[];
  let deletedDigests: string[];
  let deletedObjects: string[];
  const spies: { mockRestore: () => void }[] = [];

  beforeEach(() => {
    manager.previousObjects = versions.map((version) => ({
      name: 'api',
      version,
      digest: `digest-${version}`,
      type: 'user-lambda',
      s3Key: objectKey(version)
    }));
    manager.previousImages = versions.map((version) => ({
      name: 'web',
      version,
      digest: `digest-${version}`,
      tag: imageTag(version),
      dockerDigest: `sha256:${version}`
    }));
    manager.successfullyCreatedObjects = [];
    manager.successfullyUploadedImages = [];
    manager.previouslyUploadedS3KeysUsedInDeployment = [];
    manager.previouslyUploadedImageTagsUsedInDeployment = [];
    deployedTemplate = templateManager.oldTemplate;
    deletedImages = [];
    deletedDigests = [];
    deletedObjects = [];
    for (const [key, value] of Object.entries(config))
      Object.defineProperty(configManager, key, { configurable: true, value });
    spies.push(
      spyOn(manager, 'deleteImagesFromEcrRepo').mockImplementation(async (tags, digests) => {
        deletedImages.push(...tags);
        deletedDigests.push(...digests);
      }),
      spyOn(manager, 'deleteObjectsFromDeploymentBucket').mockImplementation(async (keys) => {
        deletedObjects.push(...keys);
      }),
      spyOn(operationReporter, 'startEvent').mockImplementation(async () => {}),
      spyOn(operationReporter, 'finishEvent').mockImplementation(async () => {})
    );
    Object.defineProperty(stackManager, 'nextVersion', { configurable: true, value: 'v000030' });
  });
  afterEach(() => {
    spies.splice(0).forEach((spy) => spy.mockRestore());
    // The own properties shadowed the class getters; removing them restores those.
    for (const key of Object.keys(config)) delete (configManager as unknown as Record<string, unknown>)[key];
    delete (stackManager as unknown as Record<string, unknown>).nextVersion;
    templateManager.oldTemplate = deployedTemplate;
  });

  // After fast deployments, CloudFormation still runs the template of the last full deployment. A later update that
  // fails rolls the function code back to the artifacts that template names.
  test('after a fast deployment, keeps what the template CloudFormation runs names', async () => {
    templateManager.oldTemplate = templateNaming({
      object: objectKey('v000001'),
      image: `${repository}:${imageTag('v000001')}`
    });
    await manager.deleteAllObsoleteArtifacts();
    // 1 + 25 versions stay; of the four older ones, the template still names v000001.
    expect(deletedObjects).toEqual(['v000002', 'v000003', 'v000004'].map(objectKey));
    expect(deletedImages).toEqual(['v000002', 'v000003', 'v000004'].map(imageTag));
  });

  // A full deployment can switch a service to an older retained tag, for example with `prebuilt-image`.
  test('after a full deployment, keeps what the template just deployed names', async () => {
    templateManager.oldTemplate = templateNaming({ image: `${repository}:${imageTag('v000030')}` });
    await manager.deleteAllObsoleteArtifacts({
      deployedTemplate: templateNaming({ image: `${repository}:${imageTag('v000002')}` })
    });
    expect(deletedImages).toEqual(['v000001', 'v000003', 'v000004'].map(imageTag));
  });

  // ECR deletes a manifest together with its last tag, so a task pinned by digest could no longer start.
  test('keeps every tag of an image the deployed template pins by digest', async () => {
    manager.previousImages.push(
      { name: undefined, version: undefined, digest: undefined, tag: 'stable', dockerDigest: 'sha256:v000001' },
      { name: undefined, version: undefined, digest: undefined, tag: '', dockerDigest: 'sha256:prebuilt' }
    );
    await manager.deleteAllObsoleteArtifacts({
      deployedTemplate: templateNaming({ image: `${repository}@sha256:v000001` })
    });
    expect(deletedImages).toEqual(['v000002', 'v000003', 'v000004'].map(imageTag));
    expect(deletedDigests).toEqual(['sha256:prebuilt']);
  });

  // Retrying a failed deployment with `--no-cache` uploads unchanged artifacts again under the same key and tag.
  test('after fixing a failed deployment, keeps what this deployment uploaded again', async () => {
    manager.previousObjects.push({
      name: 'api',
      version: 'v000030',
      digest: 'abandoned',
      type: 'user-lambda',
      s3Key: 'api/v000030-abandoned.zip'
    });
    manager.previousImages.push({
      name: 'web',
      version: 'v000030',
      digest: 'abandoned',
      tag: 'web--abandoned--v000030',
      dockerDigest: 'sha256:abandoned'
    });
    manager.successfullyCreatedObjects = [{ s3Key: objectKey('v000030'), name: 'api' }];
    manager.successfullyUploadedImages = [{ tag: imageTag('v000030'), name: 'web' }];
    await manager.deleteArtifactsFixedDeploy({
      deployedTemplate: templateNaming({ object: objectKey('v000030'), image: `${repository}:${imageTag('v000030')}` })
    });
    expect(deletedObjects).toEqual(['api/v000030-abandoned.zip']);
    expect(deletedImages).toEqual(['web--abandoned--v000030']);
  });
});
