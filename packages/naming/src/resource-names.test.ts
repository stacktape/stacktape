import { beforeEach, describe, expect, test } from 'bun:test';
import { awsResourceNames } from './aws-resource-names';
import { buildResourceName, obfuscatedNamesStateHolder } from './resource-names';

describe('resource names', () => {
  beforeEach(() => {
    // Keep the module-level CLI signal assertions independent of test order.
    obfuscatedNamesStateHolder.usingObfuscateNames = false;
  });

  test('keeps exact-limit names and applies the established SHAKE256 suffix above the limit', () => {
    expect(buildResourceName({ proposedResourceName: 'abcdefghij', lengthLimit: 10 })).toBe('abcdefghij');
    expect(obfuscatedNamesStateHolder.usingObfuscateNames).toBe(false);
    expect(buildResourceName({ proposedResourceName: 'abcdefghijk', lengthLimit: 10 })).toBe('abc-f6ea2e');
    expect(obfuscatedNamesStateHolder.usingObfuscateNames).toBe(true);
    expect(buildResourceName({ proposedResourceName: 'fits', lengthLimit: 10 })).toBe('fits');
    expect(obfuscatedNamesStateHolder.usingObfuscateNames).toBe(true);
  });

  test('hashes the complete proposed name when truncating names with a shared prefix', () => {
    const first = buildResourceName({ proposedResourceName: 'prefix-shared-tail-one', lengthLimit: 18 });
    const second = buildResourceName({ proposedResourceName: 'prefix-shared-tail-two', lengthLimit: 18 });

    expect(first).toBe('prefix-shar-b8a445');
    expect(second).toBe('prefix-shar-c5d85e');
    expect(first).toHaveLength(18);
    expect(second).toHaveLength(18);
  });

  test('contains the CLI and Console naming union without changing outputs', () => {
    expect(awsResourceNames.agentCoreRuntime('my-project-dev', 'Agent Name')).toBe('stp_my_project_dev_Agent_Name');
    expect(awsResourceNames.kinesisStream('Events', 'my-project-dev')).toBe('my-project-dev-Events');
    // S3 rejects uppercase; a camelCase resource name must keep its lowercased physical bucket name.
    expect(awsResourceNames.bucket('userUploads', 'my-project-dev', 'de773011')).toBe(
      'my-project-dev-useruploads-de773011'
    );
    expect(awsResourceNames.cloudwatchAlarmNotificationRule('my-project-dev', 'Errors')).toBe(
      'my-project-dev-alarm-notification-Errors'
    );
    expect(awsResourceNames.ec2RunnerInstanceName('my-project')).toBe('stp-runner-my-project');
    expect(awsResourceNames.ec2RunnerSecurityGroupName('eu-west-1')).toBe('stp-ec2-runner-sg-eu-west-1');
    expect(awsResourceNames.ec2RunnerIamRoleName('runner-123')).toBe('stp-ec2-runner-runner-123');
    expect(awsResourceNames.ec2RunnerInstanceProfileName('runner-123')).toBe('stp-ec2-runner-runner-123');
    expect(awsResourceNames.ec2RunnerLogGroupName()).toBe('/stacktape/ec2-runner');
  });
});
