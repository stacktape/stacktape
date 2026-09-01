import { describe, expect, test } from 'bun:test';
import { awsResourceNames } from './aws-resource-names';
import { buildResourceName, obfuscatedNamesStateHolder } from './resource-names';
import { shortHash } from './short-hash';

describe('resource names', () => {
  test('keeps exact-limit names and applies the established SHAKE256 suffix above the limit', () => {
    expect(buildResourceName({ proposedResourceName: 'abcdefghij', lengthLimit: 10 })).toBe('abcdefghij');
    expect(buildResourceName({ proposedResourceName: 'abcdefghijk', lengthLimit: 10 })).toBe('abc-f6ea2e');
    expect(obfuscatedNamesStateHolder.usingObfuscateNames).toBe(true);
  });

  test('preserves the shared short hash algorithm', () => {
    expect(shortHash('123456789012')).toBe('f2003d47');
  });

  test('contains the CLI and Console naming union without changing outputs', () => {
    expect(awsResourceNames.agentCoreRuntime('my-project-dev', 'Agent Name')).toBe('stp_my_project_dev_Agent_Name');
    expect(awsResourceNames.kinesisStream('Events', 'my-project-dev')).toBe('my-project-dev-Events');
    expect(awsResourceNames.cloudwatchAlarmNotificationRule('my-project-dev', 'Errors')).toBe(
      'my-project-dev-alarm-notification-Errors'
    );
    expect(awsResourceNames.ec2RunnerInstanceName('my-project')).toBe('stp-runner-my-project');
    expect(awsResourceNames.ec2RunnerSecurityGroupName('eu-west-1')).toBe('stp-ec2-runner-sg-eu-west-1');
    expect(awsResourceNames.ec2RunnerIamRoleName()).toBe('stp-ec2-runner-role');
    expect(awsResourceNames.ec2RunnerInstanceProfileName()).toBe('stp-ec2-runner-instance-profile');
    expect(awsResourceNames.ec2RunnerLogGroupName()).toBe('/stacktape/ec2-runner');
  });
});
