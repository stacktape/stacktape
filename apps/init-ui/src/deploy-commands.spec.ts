import { describe, expect, it } from 'bun:test';
import { stackCommand } from './deploy-commands';

describe('stackCommand', () => {
  it('makes every stack target explicit for deploy and delete', () => {
    const target = {
      configPath: 'stacktape.yml',
      projectName: 'orders-api',
      stage: 'dev',
      region: 'eu-west-1'
    };

    expect(stackCommand('deploy', target)).toBe(
      'stacktape deploy --config stacktape.yml --project orders-api --stage dev --region eu-west-1'
    );
    expect(stackCommand('delete', target)).toBe(
      'stacktape delete --config stacktape.yml --project orders-api --stage dev --region eu-west-1'
    );
  });

  it('quotes a generated config path that contains spaces', () => {
    expect(
      stackCommand('delete', {
        configPath: 'generated config/stacktape.yml',
        projectName: 'orders-api',
        stage: 'dev',
        region: 'eu-west-1'
      })
    ).toContain('--config "generated config/stacktape.yml"');
  });

  it('names the AWS account the wizard was started with, so a delete cannot reach another account', () => {
    expect(
      stackCommand('stack recover', {
        configPath: 'stacktape.yml',
        projectName: 'orders-api',
        stage: 'dev',
        region: 'eu-west-1',
        awsAccount: 'development'
      })
    ).toBe(
      'stacktape stack recover --config stacktape.yml --project orders-api --stage dev --region eu-west-1 --aws-account development'
    );
  });
});
