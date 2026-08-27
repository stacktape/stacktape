import type {
  ServiceLambdaResolver,
  StpServiceCustomResourceProperties,
  StpServiceCustomResourceUptimeMonitoringProps
} from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { UptimeCheckManifestEntry, UptimeRegionAssignment } from '@helper-lambdas/uptimeProber/manifest';
import { normalizeUptimeManifestEntry } from '@helper-lambdas/uptimeProber/manifest';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { IAM, EntityAlreadyExistsException, NoSuchEntityException } from '@aws-sdk/client-iam';
import {
  Lambda,
  ResourceConflictException as LambdaConflictException,
  ResourceNotFoundException as LambdaNotFoundException,
  waitUntilFunctionActiveV2,
  waitUntilFunctionUpdatedV2
} from '@aws-sdk/client-lambda';
import { S3 } from '@aws-sdk/client-s3';
import { ParameterNotFound, SSM } from '@aws-sdk/client-ssm';
import { helperLambdaAwsResourceNames } from '@stacktape/naming/helper-lambda-resource-names';
import { shortHash } from '@stacktape/naming/short-hash';
import { tagNames } from '@stacktape/naming/tag-names';
import { getAssumeRolePolicyDocumentForFunctionRole } from 'src/aws/iam';
import { wait } from '@utils/misc';

const PROBER_RUNTIME = 'nodejs22.x';
const PROBER_MEMORY_MB = 192;
// Under the 60s tick so two invocations never overlap even with the +30s probe round.
const PROBER_TIMEOUT_SECONDS = 55;
const SCHEDULE_PERMISSION_STATEMENT_ID = 'stacktape-uptime-prober-tick';

const iamApi = new IAM({});
const regionClients = new Map<string, { lambda: Lambda; s3: S3; ssm: SSM; events: EventBridge }>();

const clientsFor = (region: string) => {
  if (!regionClients.has(region)) {
    regionClients.set(region, {
      lambda: new Lambda({ region }),
      s3: new S3({ region }),
      ssm: new SSM({ region }),
      events: new EventBridge({ region })
    });
  }
  return regionClients.get(region)!;
};

const stackTags = () => ({
  [tagNames.stackName()]: process.env.STACK_NAME,
  [tagNames.projectName()]: process.env.PROJECT_NAME,
  [tagNames.stage()]: process.env.STAGE
});

export const uptimeMonitoring: ServiceLambdaResolver<StpServiceCustomResourceProperties['uptimeMonitoring']> = async (
  currentProps,
  previousProps,
  operation,
  _physicalResourceId,
  lambdaContext
) => {
  console.info(
    `Resolver uptimeMonitoring, event type: ${operation}\n` +
      `Regions: ${JSON.stringify(currentProps.regionAssignments.map(({ region, checks }) => `${region}:${checks.length}`))}\n` +
      `Previous regions: ${JSON.stringify(
        (previousProps?.regionAssignments || []).map(({ region, checks }) => `${region}:${checks.length}`)
      )}`
  );
  const accountId = lambdaContext?.invokedFunctionArn?.split(':')[4] || process.env.AWS_ACCOUNT_ID;
  if (!accountId) {
    throw new Error('Cannot determine the AWS account id for uptime monitoring provisioning.');
  }
  const accountIdShortHash = shortHash(accountId);

  // Deliberately NO last-one-out teardown of the shared prober: an idle prober is a single tiny
  // Lambda ticking within the free tier, while coordinated teardown across concurrently deploying
  // stacks would need a real distributed lock. Deletion only removes this stack's manifests.
  if (operation === 'Delete') {
    await settleAcrossRegions(
      currentProps.regionAssignments.map((assignment) => async () => {
        await deleteManifestEntries({ region: assignment.region, entries: assignment.checks });
      })
    );
    return { data: {} };
  }

  const roleArn = await ensureProberRole();
  await settleAcrossRegions(
    currentProps.regionAssignments.map((assignment) => async () => {
      const previousAssignment = previousProps?.regionAssignments.find(({ region }) => region === assignment.region);
      await provisionRegion({
        assignment,
        previousAssignment,
        props: currentProps,
        roleArn,
        accountId,
        accountIdShortHash
      });
    })
  );

  const abandonedAssignments = (previousProps?.regionAssignments || []).filter(
    ({ region }) => !currentProps.regionAssignments.some((assignment) => assignment.region === region)
  );
  await settleAcrossRegions(
    abandonedAssignments.map((assignment) => async () => {
      await deleteManifestEntries({ region: assignment.region, entries: assignment.checks });
    })
  );
  return { data: {} };
};

/** Every regional operation settles before the first failure propagates, so no region is left mid-flight. */
const settleAcrossRegions = async (operations: (() => Promise<void>)[]) => {
  const results = await Promise.allSettled(operations.map((operation) => operation()));
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failures.length) {
    throw new Error(failures.map(({ reason }) => String(reason instanceof Error ? reason.message : reason)).join('; '));
  }
};

const provisionRegion = async ({
  assignment,
  previousAssignment,
  props,
  roleArn,
  accountId,
  accountIdShortHash
}: {
  assignment: UptimeRegionAssignment;
  previousAssignment: UptimeRegionAssignment | undefined;
  props: StpServiceCustomResourceUptimeMonitoringProps;
  roleArn: string;
  accountId: string;
  accountIdShortHash: string;
}) => {
  const region = assignment.region;
  const { lambda, s3, ssm, events } = clientsFor(region);
  const functionName = helperLambdaAwsResourceNames.uptimeProberFunction();
  const stagingBucket = helperLambdaAwsResourceNames.uptimeProberArtifactsBucket(accountIdShortHash, region);

  // Manifests are written before the prober infrastructure so a concurrent stack's last-one-out
  // teardown can never observe an empty prefix while this stack still expects probing here.
  // Normalization is load-bearing: CloudFormation stringified every scalar of these entries on the
  // way into the custom resource, and the prober rejects (or mis-evaluates) stringified manifests.
  await Promise.all(
    assignment.checks.map((entry) =>
      ssm.putParameter({
        Name: helperLambdaAwsResourceNames.uptimeManifestParameter(entry.stackName, entry.checkName),
        Value: JSON.stringify(normalizeUptimeManifestEntry(entry)),
        Type: 'String',
        Overwrite: true
      })
    )
  );
  const removedChecks = (previousAssignment?.checks || []).filter(
    ({ checkName }) => !assignment.checks.some((check) => check.checkName === checkName)
  );
  if (removedChecks.length) {
    await deleteManifestEntries({ region, entries: removedChecks });
  }

  await ensureStagingBucket({ s3, bucketName: stagingBucket, region });
  await ensureArtifactCopied({ s3, stagingBucket, proberArtifact: props.proberArtifact });

  const desiredEnvironment = {
    STACKTAPE_TRPC_API_ENDPOINT: props.apiUrl,
    ARTIFACT_DIGEST: props.proberArtifact.digest
  };
  let existing = await getFunction({ lambda, functionName });
  if (!existing) {
    console.info(`Creating uptime prober in ${region}...`);
    try {
      await lambda.createFunction({
        FunctionName: functionName,
        Code: { S3Bucket: stagingBucket, S3Key: props.proberArtifact.s3Key },
        Handler: 'index.default',
        Role: roleArn,
        Runtime: PROBER_RUNTIME,
        MemorySize: PROBER_MEMORY_MB,
        Timeout: PROBER_TIMEOUT_SECONDS,
        Environment: { Variables: desiredEnvironment },
        Tags: stackTags()
      });
    } catch (err) {
      // Another stack's deploy created it concurrently; reconcile against the winner below.
      if (!(err instanceof LambdaConflictException)) {
        throw err;
      }
    }
    await waitUntilFunctionActiveV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: functionName });
    existing = await getFunction({ lambda, functionName });
  }
  const currentDigest = existing?.Configuration?.Environment?.Variables?.ARTIFACT_DIGEST;
  const currentApiUrl = existing?.Configuration?.Environment?.Variables?.STACKTAPE_TRPC_API_ENDPOINT;
  // Concurrent deploys of different stacks race on the shared prober: a conflict means the other
  // deploy's update is mid-flight, so wait it out and retry rather than failing this deployment.
  const updateToleratingConcurrentDeploys = async (performUpdate: () => Promise<unknown>) => {
    for (let attempt = 0; ; attempt++) {
      try {
        await performUpdate();
        return;
      } catch (err) {
        if (!(err instanceof LambdaConflictException) || attempt >= 5) {
          throw err;
        }
        await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: functionName });
      }
    }
  };
  if (currentDigest !== props.proberArtifact.digest) {
    console.info(`Updating uptime prober code in ${region} (${currentDigest} -> ${props.proberArtifact.digest})...`);
    await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: functionName });
    await updateToleratingConcurrentDeploys(() =>
      lambda.updateFunctionCode({
        FunctionName: functionName,
        S3Bucket: stagingBucket,
        S3Key: props.proberArtifact.s3Key
      })
    );
  }
  if (currentDigest !== props.proberArtifact.digest || currentApiUrl !== props.apiUrl) {
    await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: functionName });
    await updateToleratingConcurrentDeploys(() =>
      lambda.updateFunctionConfiguration({
        FunctionName: functionName,
        Environment: { Variables: desiredEnvironment },
        MemorySize: PROBER_MEMORY_MB,
        Timeout: PROBER_TIMEOUT_SECONDS,
        Runtime: PROBER_RUNTIME
      })
    );
    await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: functionName });
  }

  const functionArn = `arn:aws:lambda:${region}:${accountId}:function:${functionName}`;
  const ruleName = helperLambdaAwsResourceNames.uptimeProberScheduleRule();
  await events.putRule({ Name: ruleName, ScheduleExpression: 'rate(1 minute)', State: 'ENABLED' });
  await events.putTargets({ Rule: ruleName, Targets: [{ Id: 'prober', Arn: functionArn }] });
  await ensureSchedulePermission({ lambda, functionName, region, accountId, ruleName });
};

const ensureSchedulePermission = async ({
  lambda,
  functionName,
  region,
  accountId,
  ruleName
}: {
  lambda: Lambda;
  functionName: string;
  region: string;
  accountId: string;
  ruleName: string;
}) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await lambda.addPermission({
        FunctionName: functionName,
        StatementId: SCHEDULE_PERMISSION_STATEMENT_ID,
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: `arn:aws:events:${region}:${accountId}:rule/${ruleName}`
      });
      return;
    } catch (err) {
      if (!(err instanceof LambdaConflictException)) {
        throw err;
      }
      // A conflict either means the statement already exists (done) or the function is mid-update
      // (retry) — verify instead of assuming, so a rule is never left without invoke permission.
      const hasStatement = await schedulePermissionExists({ lambda, functionName });
      if (hasStatement) {
        return;
      }
      await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: functionName });
      await wait(2000 * attempt);
    }
  }
  throw new Error(`Could not attach the schedule invoke permission to ${functionName}.`);
};

const schedulePermissionExists = async ({ lambda, functionName }: { lambda: Lambda; functionName: string }) => {
  try {
    const policy = await lambda.getPolicy({ FunctionName: functionName });
    return !!policy.Policy && policy.Policy.includes(SCHEDULE_PERMISSION_STATEMENT_ID);
  } catch (err) {
    if (err instanceof LambdaNotFoundException) {
      return false;
    }
    // GetPolicy throws ResourceNotFound when the function has no policy at all.
    return false;
  }
};

const ensureProberRole = async () => {
  const roleName = helperLambdaAwsResourceNames.uptimeProberRole();
  let roleArn: string;
  let created = false;
  try {
    const existing = await iamApi.getRole({ RoleName: roleName });
    roleArn = existing.Role!.Arn!;
  } catch (err) {
    if (!(err instanceof NoSuchEntityException)) {
      throw err;
    }
    console.info(`Creating uptime prober role ${roleName}...`);
    try {
      const newRole = await iamApi.createRole({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify(getAssumeRolePolicyDocumentForFunctionRole()),
        Description: 'Role used by the Stacktape uptime prober functions in every region of this account.'
      });
      roleArn = newRole.Role!.Arn!;
      created = true;
    } catch (creationError) {
      if (!(creationError instanceof EntityAlreadyExistsException)) {
        throw creationError;
      }
      roleArn = (await iamApi.getRole({ RoleName: roleName })).Role!.Arn!;
    }
  }
  await iamApi.putRolePolicy({
    RoleName: roleName,
    PolicyName: 'stacktape-uptime-prober',
    PolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
          Resource: `arn:aws:logs:*:*:log-group:${helperLambdaAwsResourceNames.uptimeProberLogGroup()}*`
        },
        {
          Effect: 'Allow',
          Action: ['ssm:GetParametersByPath', 'ssm:GetParameter'],
          Resource: `arn:aws:ssm:*:*:parameter${helperLambdaAwsResourceNames.uptimeManifestParameterPrefix()}*`
        }
      ]
    })
  });
  if (created) {
    // Fresh roles need time to propagate before Lambda accepts them (same as the edge lambda flow).
    await wait(10000);
  }
  return roleArn;
};

const ensureStagingBucket = async ({ s3, bucketName, region }: { s3: S3; bucketName: string; region: string }) => {
  try {
    await s3.createBucket({
      Bucket: bucketName,
      ...(region === 'us-east-1' ? {} : { CreateBucketConfiguration: { LocationConstraint: region as any } })
    });
    console.info(`Created uptime prober staging bucket ${bucketName}.`);
  } catch (err) {
    const code = (err as { name?: string }).name;
    if (code !== 'BucketAlreadyOwnedByYou' && code !== 'BucketAlreadyExists') {
      throw err;
    }
  }
};

const ensureArtifactCopied = async ({
  s3,
  stagingBucket,
  proberArtifact
}: {
  s3: S3;
  stagingBucket: string;
  proberArtifact: StpServiceCustomResourceUptimeMonitoringProps['proberArtifact'];
}) => {
  try {
    // Keys embed the content digest, so an existing object is by definition the right bytes.
    await s3.headObject({ Bucket: stagingBucket, Key: proberArtifact.s3Key });
    return;
  } catch (err) {
    if ((err as { name?: string }).name !== 'NotFound' && (err as { name?: string }).name !== 'NoSuchKey') {
      throw err;
    }
  }
  console.info(`Copying prober artifact ${proberArtifact.s3Key} into ${stagingBucket}...`);
  await s3.copyObject({
    Bucket: stagingBucket,
    CopySource: `${proberArtifact.bucketName}/${proberArtifact.s3Key}`,
    Key: proberArtifact.s3Key
  });
};

const deleteManifestEntries = async ({ region, entries }: { region: string; entries: UptimeCheckManifestEntry[] }) => {
  const { ssm } = clientsFor(region);
  await Promise.all(
    entries.map(async (entry) => {
      try {
        await ssm.deleteParameter({
          Name: helperLambdaAwsResourceNames.uptimeManifestParameter(entry.stackName, entry.checkName)
        });
      } catch (err) {
        if (!(err instanceof ParameterNotFound)) {
          throw err;
        }
      }
    })
  );
};

const getFunction = async ({ lambda, functionName }: { lambda: Lambda; functionName: string }) => {
  try {
    return await lambda.getFunction({ FunctionName: functionName });
  } catch (err) {
    if (err instanceof LambdaNotFoundException) {
      return undefined;
    }
    throw err;
  }
};
