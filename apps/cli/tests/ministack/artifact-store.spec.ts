import { expect, test } from 'bun:test';
import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  waitUntilStackCreateComplete,
  waitUntilStackDeleteComplete
} from '@aws-sdk/client-cloudformation';
import { DescribeRepositoriesCommand, ECRClient, GetLifecyclePolicyCommand } from '@aws-sdk/client-ecr';
import {
  GetBucketCorsCommand,
  GetBucketPolicyCommand,
  GetBucketTaggingCommand,
  HeadBucketCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { startMiniStack } from '@stacktape/ministack/fixture';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { operationReporter } from '@application-services/operation-manager';
import { configManager } from '@domain-services/config-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';

// The deployment bucket and image repository of a new stack: created by the CLI with real SDK calls, idempotently, and
// deleted after a first deploy that leaves no stack, but kept while a stack uses them.
test('a new stack gets its deployment bucket and repository before the stack and loses them only with it', async () => {
  const ministack = await startMiniStack({ label: 'artifact-store' });
  const clientConfig = ministack.clientConfig(ministack.account());
  const s3 = new S3Client(clientConfig);
  const ecr = new ECRClient(clientConfig);
  const cloudFormation = new CloudFormationClient(clientConfig);
  const previousTargetStack = globalStateManager.targetStack;
  try {
    awsSdkManager.init({ ...clientConfig, region: 'eu-west-1', plugins: [] });
    operationReporter.setSilentMode(true);
    configManager.config = { resources: {}, stackConfig: { tags: [{ name: 'team', value: 'payments' }] } };
    globalStateManager.targetStack = {
      stackName: 'shop-dev',
      projectName: 'shop',
      stage: 'dev',
      globallyUniqueStackHash: 'a1b2c3d4',
      projectId: 'project'
    };
    await stackManager.init({
      stackName: 'shop-dev',
      commandModifiesStack: false,
      commandRequiresDeployedStack: false
    });
    const bucketName = 'stp-deployment-bucket-a1b2c3d4';
    const repositoryName = 'a1b2c3d4-stp-multi-container-workload-repo';
    deploymentArtifactManager.deploymentBucketName = bucketName;
    deploymentArtifactManager.repositoryName = repositoryName;
    expect(deploymentArtifactManager.artifactStoreIsStackResource).toBe(false);

    // A retry after an interrupted first deploy finds both and completes them.
    await deploymentArtifactManager.createArtifactStore();
    await deploymentArtifactManager.createArtifactStore();

    const policy = JSON.parse((await s3.send(new GetBucketPolicyCommand({ Bucket: bucketName }))).Policy!);
    expect(policy.Statement).toEqual([
      expect.objectContaining({
        Effect: 'Deny',
        Action: 's3:*',
        Resource: [`arn:aws:s3:::${bucketName}/*`],
        Condition: { Bool: { 'aws:SecureTransport': false } }
      })
    ]);
    expect((await s3.send(new GetBucketCorsCommand({ Bucket: bucketName }))).CORSRules).toEqual([
      expect.objectContaining({ AllowedHeaders: ['*'], AllowedMethods: ['GET'], AllowedOrigins: ['*'] })
    ]);
    const tags = (await s3.send(new GetBucketTaggingCommand({ Bucket: bucketName }))).TagSet ?? [];
    expect(tags).toEqual(expect.arrayContaining([{ Key: 'team', Value: 'payments' }]));
    const [repository] =
      (await ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [repositoryName] }))).repositories ?? [];
    expect(repository?.imageScanningConfiguration?.scanOnPush).toBe(true);
    const lifecycle = await ecr.send(new GetLifecyclePolicyCommand({ repositoryName }));
    expect(JSON.parse(lifecycle.lifecyclePolicyText!).rules[0].selection.tagStatus).toBe('untagged');

    // While a stack exists, a failed deploy keeps them for the next one.
    await s3.send(
      new PutBucketVersioningCommand({ Bucket: bucketName, VersioningConfiguration: { Status: 'Enabled' } })
    );
    for (const Body of ['v1', 'v2']) {
      await s3.send(new PutObjectCommand({ Bucket: bucketName, Key: 'cf-template/v000001.yml', Body }));
    }
    await cloudFormation.send(
      new CreateStackCommand({
        StackName: 'shop-dev',
        TemplateBody: JSON.stringify({ Resources: { Handle: { Type: 'AWS::CloudFormation::WaitConditionHandle' } } })
      })
    );
    await waitUntilStackCreateComplete({ client: cloudFormation, maxWaitTime: 60 }, { StackName: 'shop-dev' });
    await deploymentArtifactManager.deleteArtifactStoreOfFailedFirstDeploy('shop-dev', { endCreation: true });
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));

    // Once the stack is gone (a failed creation rolls back by deleting it), they go, every object version included.
    await cloudFormation.send(new DeleteStackCommand({ StackName: 'shop-dev' }));
    await waitUntilStackDeleteComplete({ client: cloudFormation, maxWaitTime: 60 }, { StackName: 'shop-dev' });
    await deploymentArtifactManager.deleteArtifactStoreOfFailedFirstDeploy('shop-dev', { endCreation: true });
    await expect(s3.send(new HeadBucketCommand({ Bucket: bucketName }))).rejects.toThrow();
    await expect(ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [repositoryName] }))).rejects.toThrow(
      /RepositoryNotFound|does not exist/
    );
    // Deleting what is already gone succeeds.
    await deploymentArtifactManager.deleteArtifactStore();
  } finally {
    globalStateManager.targetStack = previousTargetStack;
    s3.destroy();
    ecr.destroy();
    cloudFormation.destroy();
    await ministack.stop();
  }
}, 180_000);
