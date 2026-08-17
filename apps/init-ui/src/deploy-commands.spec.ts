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
      'stacktape deploy --configPath stacktape.yml --projectName orders-api --stage dev --region eu-west-1'
    );
    expect(stackCommand('delete', target)).toBe(
      'stacktape delete --configPath stacktape.yml --projectName orders-api --stage dev --region eu-west-1'
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
    ).toContain('--configPath "generated config/stacktape.yml"');
  });
});
