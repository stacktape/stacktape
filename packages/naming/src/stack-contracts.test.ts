import { describe, expect, test } from 'bun:test';
import {
  buildSSMParameterNameForReferencableParam,
  getEc2RunnerApiKeySsmParameterName,
  getEc2RunnerGitTokenSsmParameterName,
  getSsmParameterNameForThirdPartyCredentials
} from './ssm-parameter-paths';
import { getExportedStackOutputName, getStackOutputName, outputNames } from './stack-output-names';
import {
  getStackCfTemplateDescription,
  getStackName,
  getStacktapeStackInfoFromTemplateDescription,
  isStacktapeStackDescription
} from './stacks';
import { tagNames } from './tag-names';

describe('Stacktape stack contracts', () => {
  test('round-trips the established stack template description', () => {
    const description = getStackCfTemplateDescription('my-project', 'production', 'abc123');
    expect(getStackName('my-project', 'production')).toBe('my-project-production');
    expect(description).toBe('STP-stack_my-project_production_abc123');
    expect(isStacktapeStackDescription(description)).toBe(true);
    expect(getStacktapeStackInfoFromTemplateDescription(description)).toEqual({
      projectName: 'my-project',
      stage: 'production',
      globallyUniqueStackHash: 'abc123'
    });
    expect(getStacktapeStackInfoFromTemplateDescription('other')).toEqual({
      projectName: '',
      stage: '',
      globallyUniqueStackHash: ''
    });
  });

  test('preserves Stacktape SSM paths, including Console EC2 runners', () => {
    expect(
      buildSSMParameterNameForReferencableParam({
        nameChain: ['api', 'environment'],
        paramName: 'TOKEN',
        region: 'eu-west-1',
        stackName: 'my-project-dev'
      })
    ).toBe('/stp/eu-west-1/my-project-dev/api.environment/TOKEN');
    expect(
      getSsmParameterNameForThirdPartyCredentials({
        credentialsIdentifier: 'mongo-atlas',
        region: 'eu-west-1'
      })
    ).toBe('/stp/third-party-provider-credentials/eu-west-1/mongo-atlas');
    expect(
      getEc2RunnerApiKeySsmParameterName({ invocationId: 'inv-123', region: 'eu-west-1', runnerId: 'runner-123' })
    ).toBe('/stp/ec2-runner/eu-west-1/runner-123/inv-123/api-key');
    expect(
      getEc2RunnerGitTokenSsmParameterName({ invocationId: 'inv-123', region: 'eu-west-1', runnerId: 'runner-123' })
    ).toBe('/stp/ec2-runner/eu-west-1/runner-123/inv-123/git-token');
  });

  test('preserves output and tag identifiers', () => {
    expect(outputNames.deploymentVersion()).toBe('StpDeploymentVersion');
    expect(outputNames.stackInfoMap()).toBe('StpStackInfoMap');
    expect(getStackOutputName('api_function', 'url')).toBe('ApiFunctionUrl');
    expect(getExportedStackOutputName('ApiUrl', 'my-project-dev')).toBe('MyProjectDevApiUrl');
    expect(tagNames.stackName()).toBe('stp:stack-name');
    expect(tagNames.globallyUniqueStackHash()).toBe('stp:globally-unique-stack-hash');
    expect(tagNames.awsCloudformationLogicalName()).toBe('aws:cloudformation:logical-id');
  });
});
