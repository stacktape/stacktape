import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { EC2Client } from '@aws-sdk/client-ec2';
import { IAMClient } from '@aws-sdk/client-iam';
import { instanceProfile, instanceProfileWaitSettings } from './instance-profile';

type Command = { constructor: { name: string }; input: Record<string, unknown> };

const awsError = (name: string, message = name) => Object.assign(new Error(message), { name });

const props = {
  instanceProfileName: 'app-prod-nat-instance-eu-west-1',
  roleName: 'app-prod-NatRole',
  probeImageId: 'ami-1',
  probeSubnetId: 'subnet-1'
};
const arn = 'arn:aws:iam::123456789012:instance-profile/app-prod-nat-instance-eu-west-1';
const rejected = () =>
  awsError('InvalidParameterValue', `Value (${arn}) for parameter iamInstanceProfile.arn is invalid.`);

/**
 * The profile is created and returned only once EC2 accepts it, and only a newly created or changed profile waits.
 * EC2 is simulated by the dry-run answers it gives while the profile propagates.
 */
describe('instanceProfile', () => {
  const calls: string[] = [];
  const original = { ...instanceProfileWaitSettings };
  let profile: { Arn: string; Roles: { RoleName: string }[] } | undefined;
  let probeAnswers: (() => Error)[] = [];
  let failNextAddRoleWith: string | undefined;
  let lastProbe: Record<string, unknown> | undefined;
  const stubs: { mockRestore: () => void }[] = [];

  beforeEach(() => {
    Object.assign(instanceProfileWaitSettings, {
      probeIntervalMs: 1,
      requiredVisibleProbes: 3,
      minWaitWithoutRejectionMs: 40,
      maxWaitMs: 200,
      iamRetryMs: 50
    });
    calls.length = 0;
    profile = undefined;
    probeAnswers = [];
    failNextAddRoleWith = undefined;
    stubs.push(
      spyOn(IAMClient.prototype, 'send').mockImplementation(async (command: Command) => {
        const name = command.constructor.name.replace('Command', '');
        calls.push(name);
        if (name === 'GetInstanceProfile') {
          if (!profile) throw awsError('NoSuchEntityException');
          return { InstanceProfile: profile };
        }
        if (name === 'CreateInstanceProfile') {
          profile = { Arn: arn, Roles: [] };
          return { InstanceProfile: profile };
        }
        if (name === 'AddRoleToInstanceProfile') {
          if (failNextAddRoleWith) {
            const error = awsError(failNextAddRoleWith);
            failNextAddRoleWith = undefined;
            throw error;
          }
          profile!.Roles.push({ RoleName: command.input.RoleName as string });
        }
        if (name === 'RemoveRoleFromInstanceProfile') {
          profile!.Roles = profile!.Roles.filter(({ RoleName }) => RoleName !== command.input.RoleName);
        }
        if (name === 'DeleteInstanceProfile') profile = undefined;
        return {};
      }) as never,
      spyOn(EC2Client.prototype, 'send').mockImplementation(async (command: Command) => {
        calls.push(`probe:${command.input.DryRun}`);
        lastProbe = command.input;
        throw (probeAnswers.shift() ?? (() => awsError('UnauthorizedOperation')))();
      }) as never
    );
  });

  afterEach(() => {
    stubs.splice(0).forEach((stub) => stub.mockRestore());
    Object.assign(instanceProfileWaitSettings, original);
  });

  test('creates the profile, adds the role and returns after EC2 has accepted it several times in a row', async () => {
    probeAnswers = [rejected, rejected, () => awsError('UnauthorizedOperation'), rejected];
    const result = await instanceProfile(props, undefined, 'Create');
    expect(result).toEqual({
      data: { Arn: arn, Name: props.instanceProfileName },
      physicalResourceId: props.instanceProfileName
    });
    expect(profile?.Roles).toEqual([{ RoleName: props.roleName }]);
    // two rejections, one acceptance, a rejection that resets the count, then three acceptances in a row
    expect(calls.filter((call) => call === 'probe:true')).toHaveLength(7);
    expect(calls.slice(0, 3)).toEqual(['GetInstanceProfile', 'CreateInstanceProfile', 'AddRoleToInstanceProfile']);
    expect(lastProbe).toMatchObject({
      DryRun: true,
      ImageId: 'ami-1',
      InstanceType: 't3.micro',
      SubnetId: 'subnet-1',
      IamInstanceProfile: { Arn: arn }
    });
  });

  test('retries a role CloudFormation has only just created', async () => {
    failNextAddRoleWith = 'NoSuchEntityException';
    probeAnswers = [rejected];
    await instanceProfile(props, undefined, 'Create');
    expect(calls.filter((call) => call === 'AddRoleToInstanceProfile')).toHaveLength(2);
    expect(profile?.Roles).toEqual([{ RoleName: props.roleName }]);
  });

  test('does not trust acceptance alone until the minimum wait has passed', async () => {
    const start = Date.now();
    await instanceProfile(props, undefined, 'Create');
    expect(Date.now() - start).toBeGreaterThanOrEqual(instanceProfileWaitSettings.minWaitWithoutRejectionMs);
  });

  test('gives up waiting after the maximum wait, as CloudFormation would', async () => {
    probeAnswers = Array.from({ length: 10_000 }, () => rejected);
    const start = Date.now();
    await instanceProfile(props, undefined, 'Create');
    expect(Date.now() - start).toBeGreaterThanOrEqual(instanceProfileWaitSettings.maxWaitMs);
  });

  test('an update that changes nothing returns without probing', async () => {
    profile = { Arn: arn, Roles: [{ RoleName: props.roleName }] };
    await instanceProfile(props, props, 'Update');
    expect(calls).toEqual(['GetInstanceProfile']);
  });

  test('an update with another role swaps the role and waits for EC2', async () => {
    profile = { Arn: arn, Roles: [{ RoleName: 'old-role' }] };
    probeAnswers = [rejected];
    await instanceProfile(props, { ...props, roleName: 'old-role' }, 'Update');
    expect(profile?.Roles).toEqual([{ RoleName: props.roleName }]);
    expect(calls).toContain('RemoveRoleFromInstanceProfile');
    expect(calls).toContain('probe:true');
  });

  test('delete removes the role and the profile, and succeeds when the profile is already gone', async () => {
    profile = { Arn: arn, Roles: [{ RoleName: props.roleName }] };
    await instanceProfile(props, undefined, 'Delete');
    expect(profile).toBeUndefined();
    expect(calls).toEqual(['GetInstanceProfile', 'RemoveRoleFromInstanceProfile', 'DeleteInstanceProfile']);
    calls.length = 0;
    await instanceProfile(props, undefined, 'Delete');
    expect(calls).toEqual(['GetInstanceProfile']);
  });
});
