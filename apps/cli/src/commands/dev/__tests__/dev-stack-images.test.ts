/**
 * Which remote images a dev start builds and pushes. A session that leaves out functions leaves its batch jobs out too:
 * they keep the image the dev stack runs, so an edit to a left-out function no longer rebuilds a batch job whose build
 * context is the whole repository (r2an finding 7). The real start logic runs against the real artifact manager; only
 * the image build and the ECR listing are replaced.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { configManager } from '@domain-services/config-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { packageDevStackImages } from '../dev-stack-deployer';

const REPOSITORY_NAME = 'shelf-dev-repo';
const REPOSITORY = `123456789012.dkr.ecr.eu-north-1.amazonaws.com/${REPOSITORY_NAME}`;
const JOB = 'report-default';
const DEPLOYED_TAG = `${JOB}--67c09c11--v000001`;
/** The digest the current source builds to: an edit anywhere in the repository changed it. */
const SOURCE_DIGEST = 'd5e9e122';

const deployedTemplate = {
  Resources: {
    [cfLogicalNames.batchJobDefinition('report')]: {
      Type: 'AWS::Batch::JobDefinition',
      Properties: { ContainerProperties: { Image: `${REPOSITORY}:${DEPLOYED_TAG}` } }
    }
  }
};

const restore: (() => void)[] = [];
const replace = <T extends object, K extends keyof T>(target: T, key: K, value: T[K]) => {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { value, configurable: true, writable: true });
  restore.push(() =>
    descriptor ? Object.defineProperty(target, key, descriptor) : delete (target as Record<K, unknown>)[key]
  );
};

let builds: (string[] | undefined)[];
let outputs: Map<string, { digest: string; skipped: boolean }>;

const start = async ({
  leftOutFunctions,
  stackExists = true,
  storedTags = [DEPLOYED_TAG]
}: {
  leftOutFunctions: string[];
  stackExists?: boolean;
  storedTags?: string[];
}) => {
  configManager.setDevSkippedFunctions(leftOutFunctions);
  replace(stackManager, 'existingStackDetails', (stackExists ? { StackName: 'shelf-dev' } : undefined) as never);
  replace(templateManager, 'oldTemplate', (stackExists ? deployedTemplate : { Resources: {} }) as never);
  replace(deploymentArtifactManager, 'loadPreviousImages', async () => {
    deploymentArtifactManager.previousImages = storedTags.map((tag) => ({
      name: JOB,
      version: '',
      digest: '',
      tag,
      dockerDigest: ''
    }));
  });
  const changed = await packageDevStackImages();
  return { changed, upload: deploymentArtifactManager.getImageUploadInfoForJob({ jobName: JOB }) };
};

beforeEach(() => {
  builds = [];
  outputs = new Map();
  replace(configManager, 'containersToPackage', [{ jobName: JOB, workloadName: 'report' }] as never);
  replace(configManager, 'allContainersRequiringPackaging', [{ jobName: JOB, workloadName: 'report' }] as never);
  replace(configManager, 'agentCoreRuntimesRequiringPackaging', [] as never);
  replace(deploymentArtifactManager, 'repositoryUrl', REPOSITORY);
  replace(deploymentArtifactManager, 'repositoryName', REPOSITORY_NAME);
  replace(stackManager, 'existingStackResources', []);
  replace(packagingManager, 'packageAllWorkloads', (async ({ onlyWorkloads }: { onlyWorkloads?: string[] }) => {
    builds.push(onlyWorkloads);
    outputs.set(JOB, { digest: SOURCE_DIGEST, skipped: false });
    return [];
  }) as never);
  deploymentArtifactManager.setPackagingSource({
    getPackagingOutputForJob: (jobName: string) => outputs.get(jobName)
  } as never);
  deploymentArtifactManager.setKeptImages(new Map());
});

afterEach(() => {
  while (restore.length) restore.pop()!();
  configManager.setDevSkippedFunctions([]);
  deploymentArtifactManager.setKeptImages(new Map());
  deploymentArtifactManager.previousImages = [];
});

describe('a dev start and the images of batch jobs', () => {
  test('a session that leaves out functions keeps the deployed image: no build, no push, the same image', async () => {
    const { changed, upload } = await start({ leftOutFunctions: ['quote'] });
    expect(builds).toEqual([]);
    expect(changed).toEqual([]);
    expect(upload).toMatchObject({ alreadyDeployed: true, imageTagWithUrl: `${REPOSITORY}:${DEPLOYED_TAG}` });
    expect(deploymentArtifactManager.getImagesToUpload()).toEqual([]);
  });

  test('a session that leaves out no function builds the changed image, as before', async () => {
    const { changed, upload } = await start({ leftOutFunctions: [] });
    expect(builds).toEqual([['report']]);
    expect(changed).toEqual(['report']);
    expect(upload).toMatchObject({ alreadyDeployed: false });
    expect(upload?.imageTagWithUrl).toContain(`${JOB}--${SOURCE_DIGEST}--`);
  });

  test('a left-out batch job without a stored deployed image is built', async () => {
    const { changed } = await start({ leftOutFunctions: ['quote'], storedTags: [] });
    expect(builds).toEqual([['report']]);
    expect(changed).toEqual(['report']);
  });

  test('the first start, before the dev stack exists, builds it', async () => {
    const { upload } = await start({ leftOutFunctions: ['quote'], stackExists: false });
    expect(builds).toEqual([['report']]);
    expect(upload).toMatchObject({ alreadyDeployed: false });
  });
});
