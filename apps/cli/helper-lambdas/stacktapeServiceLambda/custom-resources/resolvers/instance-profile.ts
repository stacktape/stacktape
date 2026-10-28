import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { EC2Client, RunInstancesCommand } from '@aws-sdk/client-ec2';
import {
  AddRoleToInstanceProfileCommand,
  CreateInstanceProfileCommand,
  DeleteInstanceProfileCommand,
  GetInstanceProfileCommand,
  IAMClient,
  RemoveRoleFromInstanceProfileCommand
} from '@aws-sdk/client-iam';

type InstanceProfileProps = StpServiceCustomResourceProperties['instanceProfile'];

/**
 * Timing of the wait for EC2. Measured on eu-west-1 (Oct 2026): EC2 rejects a new profile for 7–11 s after
 * `AddRoleToInstanceProfile`, and `CreateAutoScalingGroup` accepted it at most ~2 s after the first dry-run launch
 * that did. CloudFormation's own `AWS::IAM::InstanceProfile` handler waits about 2 minutes every time.
 */
export const instanceProfileWaitSettings = {
  probeIntervalMs: 1000,
  /** Consecutive dry runs that must see the profile. */
  requiredVisibleProbes: 5,
  /** Without ever seeing EC2 reject the profile, the dry runs alone are not trusted before this. */
  minWaitWithoutRejectionMs: 30_000,
  /** After this the profile is used anyway, as CloudFormation would. */
  maxWaitMs: 150_000,
  /** How long IAM permission and role propagation errors are retried. */
  iamRetryMs: 90_000
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** SDK v3 names IAM errors `<Code>Exception` (`NoSuchEntityException`); EC2 errors carry the bare code. */
const errorName = (error: unknown) => String((error as { name?: string })?.name ?? '').replace(/Exception$/, '');

const withIamRetry = async <T>(operation: () => Promise<T>, retryOn: string[]): Promise<T> => {
  const start = Date.now();
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (!retryOn.includes(errorName(error)) || Date.now() - start > instanceProfileWaitSettings.iamRetryMs) {
        throw error;
      }
      console.info(`[instance-profile] retrying after ${errorName(error)}`);
      await sleep(2000);
    }
  }
};

// The service Lambda's permission for this profile is a separate policy created just before the custom resource.
const PERMISSION_PROPAGATION_ERRORS = ['AccessDenied'];

const getProfile = async (iam: IAMClient, instanceProfileName: string) => {
  try {
    const { InstanceProfile } = await withIamRetry(
      () => iam.send(new GetInstanceProfileCommand({ InstanceProfileName: instanceProfileName })),
      PERMISSION_PROPAGATION_ERRORS
    );
    return InstanceProfile;
  } catch (error) {
    if (errorName(error) === 'NoSuchEntity') return undefined;
    throw error;
  }
};

/**
 * Whether EC2 sees the profile, judged from a dry-run launch. The service Lambda has no `ec2:RunInstances` permission:
 * EC2 validates the profile before it checks authorization, so an unknown profile fails with `InvalidParameterValue`
 * and a known one with `UnauthorizedOperation`. No instance can be launched by this call.
 */
const probeProfile = async (
  ec2: EC2Client,
  { arn, probeImageId, probeSubnetId }: { arn: string; probeImageId: string; probeSubnetId: string }
): Promise<'visible' | 'rejected' | 'unknown'> => {
  try {
    await ec2.send(
      new RunInstancesCommand({
        DryRun: true,
        // A complete launch request: without a subnet and an instance type EC2 falls back to the default VPC and
        // m1.small, and could reject those before it looks at the profile.
        ImageId: probeImageId,
        InstanceType: 't3.micro',
        SubnetId: probeSubnetId,
        MinCount: 1,
        MaxCount: 1,
        IamInstanceProfile: { Arn: arn }
      })
    );
    return 'visible';
  } catch (error) {
    const name = errorName(error);
    if (name === 'UnauthorizedOperation' || name === 'DryRunOperation') return 'visible';
    if (name === 'InvalidParameterValue' && /iamInstanceProfile/i.test(String((error as Error).message))) {
      return 'rejected';
    }
    console.info(`[instance-profile] dry run returned ${name}: ${String((error as Error).message).slice(0, 200)}`);
    return 'unknown';
  }
};

/**
 * Returns once EC2 accepts the profile in launches. Launch templates and Auto Scaling groups that name a profile EC2
 * does not know yet fail (`CreateAutoScalingGroup` rejects the launch template), which is what CloudFormation's
 * 2-minute wait protects against.
 */
export const waitUntilEc2AcceptsProfile = async ({
  ec2,
  arn,
  probeImageId,
  probeSubnetId
}: {
  ec2: EC2Client;
  arn: string;
  probeImageId: string;
  probeSubnetId: string;
}) => {
  const { probeIntervalMs, requiredVisibleProbes, minWaitWithoutRejectionMs, maxWaitMs } = instanceProfileWaitSettings;
  const start = Date.now();
  let sawRejection = false;
  let visibleStreak = 0;
  for (;;) {
    const result = await probeProfile(ec2, { arn, probeImageId, probeSubnetId });
    sawRejection ||= result === 'rejected';
    visibleStreak = result === 'visible' ? visibleStreak + 1 : 0;
    const elapsed = Date.now() - start;
    if (visibleStreak >= requiredVisibleProbes && (sawRejection || elapsed >= minWaitWithoutRejectionMs)) {
      console.info(`[instance-profile] EC2 accepts ${arn} after ${elapsed} ms`);
      return;
    }
    if (elapsed >= maxWaitMs) {
      console.warn(`[instance-profile] EC2 did not confirm ${arn} within ${elapsed} ms; continuing`);
      return;
    }
    await sleep(probeIntervalMs);
  }
};

const ensureProfile = async ({
  iam,
  ec2,
  props
}: {
  iam: IAMClient;
  ec2: EC2Client;
  props: NonNullable<InstanceProfileProps>;
}) => {
  const { instanceProfileName, probeImageId } = props;
  const roleName = props.roleName as string;
  const probeSubnetId = props.probeSubnetId as string;
  let changed = false;
  let profile = await getProfile(iam, instanceProfileName);
  if (!profile) {
    try {
      ({ InstanceProfile: profile } = await withIamRetry(
        () => iam.send(new CreateInstanceProfileCommand({ InstanceProfileName: instanceProfileName })),
        PERMISSION_PROPAGATION_ERRORS
      ));
      changed = true;
    } catch (error) {
      if (errorName(error) !== 'EntityAlreadyExists') throw error;
      profile = await getProfile(iam, instanceProfileName);
    }
  }
  const attachedRoles = (profile?.Roles ?? []).map(({ RoleName }) => RoleName as string);
  for (const attachedRole of attachedRoles.filter((name) => name !== roleName)) {
    await iam.send(
      new RemoveRoleFromInstanceProfileCommand({ InstanceProfileName: instanceProfileName, RoleName: attachedRole })
    );
    changed = true;
  }
  if (!attachedRoles.includes(roleName)) {
    // A role CloudFormation has just created can briefly be unknown to this call.
    await withIamRetry(
      () =>
        iam.send(new AddRoleToInstanceProfileCommand({ InstanceProfileName: instanceProfileName, RoleName: roleName })),
      [...PERMISSION_PROPAGATION_ERRORS, 'NoSuchEntity']
    );
    changed = true;
  }
  const arn = profile?.Arn as string;
  if (changed) {
    await waitUntilEc2AcceptsProfile({ ec2, arn, probeImageId, probeSubnetId });
  }
  return { data: { Arn: arn, Name: instanceProfileName }, physicalResourceId: instanceProfileName };
};

const deleteProfile = async (iam: IAMClient, instanceProfileName: string) => {
  const profile = await getProfile(iam, instanceProfileName);
  if (!profile) return;
  for (const { RoleName } of profile.Roles ?? []) {
    try {
      await iam.send(new RemoveRoleFromInstanceProfileCommand({ InstanceProfileName: instanceProfileName, RoleName }));
    } catch (error) {
      if (errorName(error) !== 'NoSuchEntity') throw error;
    }
  }
  try {
    await iam.send(new DeleteInstanceProfileCommand({ InstanceProfileName: instanceProfileName }));
  } catch (error) {
    if (errorName(error) !== 'NoSuchEntity') throw error;
  }
};

/**
 * Creates the instance profile that CloudFormation would create as `AWS::IAM::InstanceProfile`, but returns as soon
 * as EC2 accepts it (about 15 s) instead of after CloudFormation's fixed wait (about 2 minutes). Stacks deployed
 * before keep their `AWS::IAM::InstanceProfile`.
 *
 * The profile's name is the physical ID. Delete removes the role and the profile; it uses the properties of the
 * deleted resource, so a rollback of a failed create also removes a profile created before the failure.
 */
export const instanceProfile: ServiceLambdaResolver<InstanceProfileProps> = async (
  currentProps,
  _previous,
  operation
) => {
  const iam = new IAMClient({});
  if (operation === 'Delete') {
    await deleteProfile(iam, currentProps.instanceProfileName);
    return { data: {}, physicalResourceId: currentProps.instanceProfileName };
  }
  const ec2 = new EC2Client({ region: process.env.AWS_REGION });
  return ensureProfile({ iam, ec2, props: currentProps });
};
