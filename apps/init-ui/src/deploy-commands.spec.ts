import { describe, expect, it } from 'bun:test';
import { secretCommand, stackCommand } from './deploy-commands';

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

describe('secretCommand', () => {
  it('builds a command that prompts for the value', () => {
    expect(secretCommand('rmq_url', 'eu-west-1')).toBe('stacktape secret set rmq_url --region eu-west-1');
    // The account the wizard was started with, kept in one argument even when its name has spaces.
    expect(secretCommand('rmq_url', 'eu-west-1', 'Development Account')).toBe(
      'stacktape secret set rmq_url --region eu-west-1 --aws-account "Development Account"'
    );
  });
});
