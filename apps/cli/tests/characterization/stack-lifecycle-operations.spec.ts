import { describe, expect, test } from 'bun:test';
import { executeCloudFormationRollbackOperation } from '../../src/commands/cf-rollback';
import { executeDeleteOperation } from '../../src/commands/delete';
import { performFullDeploy } from '../../src/commands/deploy';
import { executeRollbackOperation } from '../../src/commands/rollback';
import { CliError, ExpectedError } from '../../src/utils/errors';

const createSpinner = (events: string[], name: string) => ({
  error: (text: string) => events.push(`${name}:error:${text}`),
  success: ({ text }: { text: string }) => events.push(`${name}:success:${text}`)
});

describe('full deploy lifecycle', () => {
  test('cleans fixed-deploy artifacts before obsolete artifacts after a successful repaired update', async () => {
    const events: string[] = [];

    await performFullDeploy({
      deploymentArtifacts: {
        cloudformationTemplateUrl: 'https://example.com/template.yml',
        deleteArtifactsRollbackedDeploy: async () => {
          events.push('delete-failed');
        },
        deleteArtifactsFixedDeploy: async () => {
          events.push('delete-fixed');
        },
        deleteAllObsoleteArtifacts: async () => {
          events.push('delete-obsolete');
        }
      },
      stack: {
        deployStack: async () => {
          events.push('deploy');
          return { warningMessages: ['deployment warning'] };
        },
        existingStackDetails: { StackStatus: 'UPDATE_FAILED' },
        isAutoRollbackEnabled: true
      },
      tui: {
        warn: (message) => events.push(`warn:${message}`)
      }
    });

    expect(events).toEqual(['deploy', 'warn:deployment warning', 'delete-fixed', 'delete-obsolete']);
  });

  test('cleans failed-deploy artifacts before rethrowing an ordinary deployment failure', async () => {
    const events: string[] = [];
    const deploymentError = new ExpectedError('DEPLOYMENT', 'Deployment failed');

    const operation = performFullDeploy({
      deploymentArtifacts: {
        cloudformationTemplateUrl: 'https://example.com/template.yml',
        deleteArtifactsRollbackedDeploy: async () => {
          events.push('delete-failed');
        },
        deleteArtifactsFixedDeploy: async () => {
          events.push('delete-fixed');
        },
        deleteAllObsoleteArtifacts: async () => {
          events.push('delete-obsolete');
        }
      },
      stack: {
        deployStack: async () => {
          events.push('deploy');
          throw deploymentError;
        },
        existingStackDetails: undefined,
        isAutoRollbackEnabled: true
      },
      tui: { warn: (message) => events.push(`warn:${message}`) }
    });

    await expect(operation).rejects.toBe(deploymentError);
    expect(events).toEqual(['deploy', 'delete-failed']);
  });

  test('retains artifacts when monitoring fails and deployment outcome is uncertain', async () => {
    const events: string[] = [];
    const monitoringError = new ExpectedError('STACK_MONITORING', 'Monitoring failed');

    const operation = performFullDeploy({
      deploymentArtifacts: {
        cloudformationTemplateUrl: 'https://example.com/template.yml',
        deleteArtifactsRollbackedDeploy: async () => {
          events.push('delete-failed');
        },
        deleteArtifactsFixedDeploy: async () => {
          events.push('delete-fixed');
        },
        deleteAllObsoleteArtifacts: async () => {
          events.push('delete-obsolete');
        }
      },
      stack: {
        deployStack: async () => {
          events.push('deploy');
          throw monitoringError;
        },
        existingStackDetails: undefined,
        isAutoRollbackEnabled: true
      },
      tui: { warn: (message) => events.push(`warn:${message}`) }
    });

    await expect(operation).rejects.toBe(monitoringError);
    expect(events).toEqual(['deploy']);
  });
});

describe('delete lifecycle', () => {
  test('termination protection stops artifact and stack deletion', async () => {
    const events: string[] = [];

    const operation = executeDeleteOperation({
      config: { config: undefined, hooks: {} },
      deploymentArtifacts: {
        deleteAllArtifacts: async () => {
          events.push('delete-artifacts');
        }
      },
      lifecycle: {
        registerHooks: async () => {
          events.push('register-hooks');
        },
        processHooks: async () => {
          events.push('process-hooks');
        }
      },
      progress: { setPhase: (phase) => events.push(`phase:${phase}`) },
      notification: {
        sendDeploymentNotification: async ({ message }) => {
          events.push(`notification:${message.type}`);
        }
      },
      stack: {
        deleteStack: async () => {
          events.push('delete-stack');
        },
        existingStackDetails: { EnableTerminationProtection: true }
      },
      stackName: 'project-dev',
      tui: {
        colorize: (_color, text) => text,
        info: () => {},
        setPendingCompletion: () => events.push('complete')
      }
    });

    await expect(operation).rejects.toBeInstanceOf(CliError);
    expect(events).toEqual(['phase:DEPLOY']);
  });

  test('deletes deployment artifacts before deleting the CloudFormation stack', async () => {
    const events: string[] = [];

    await executeDeleteOperation({
      config: { config: undefined, hooks: {} },
      deploymentArtifacts: {
        deleteAllArtifacts: async () => {
          events.push('delete-artifacts');
        }
      },
      lifecycle: {
        registerHooks: async () => {
          events.push('register-hooks');
        },
        processHooks: async () => {
          events.push('process-hooks');
        }
      },
      progress: { setPhase: (phase) => events.push(`phase:${phase}`) },
      notification: {
        sendDeploymentNotification: async ({ message }) => {
          events.push(`notification:${message.type}`);
        }
      },
      stack: {
        deleteStack: async () => {
          events.push('delete-stack');
        },
        existingStackDetails: { EnableTerminationProtection: false }
      },
      stackName: 'project-dev',
      tui: {
        colorize: (_color, text) => text,
        info: () => {},
        setPendingCompletion: () => events.push('complete')
      }
    });

    expect(events).toEqual([
      'phase:DEPLOY',
      'notification:progress',
      'delete-artifacts',
      'delete-stack',
      'notification:success',
      'complete'
    ]);
  });
});

describe('Stacktape version rollback lifecycle', () => {
  test('fails before mutation when the selected version has no deployment artifacts', async () => {
    const events: string[] = [];

    const operation = executeRollbackOperation({
      args: { targetVersion: 'v000001' },
      deployedStackOverview: { getStackMetadata: () => '{}' },
      deploymentArtifacts: {
        availablePreviousVersions: [],
        prepareRollbackTemplate: async () => {
          events.push('prepare');
          return 'template-url';
        },
        restoreBucketSyncFromManifest: async () => {
          events.push('restore-buckets');
        },
        verifyArtifactsForVersion: async () => {
          events.push('verify');
        }
      },
      progress: { setPhase: (phase) => events.push(`phase:${phase}`) },
      stack: {
        deployStackForRollback: async () => {
          events.push('deploy');
        },
        lastVersion: 'v000002',
        nextVersion: 'v000003'
      },
      stackName: 'project-dev',
      tui: {
        createSpinner: ({ text }) => createSpinner(events, text),
        info: (message) => events.push(`info:${message}`),
        prettyStackName: (stackName) => stackName,
        warn: (message) => events.push(`warn:${message}`)
      }
    });

    await expect(operation).rejects.toBeInstanceOf(CliError);
    expect(events).not.toContain('prepare');
    expect(events).not.toContain('deploy');
    expect(events).not.toContain('restore-buckets');
  });

  test('deploys the selected version and treats bucket restoration as best-effort', async () => {
    const events: string[] = [];

    await executeRollbackOperation({
      args: { targetVersion: 'v000001' },
      deployedStackOverview: { getStackMetadata: () => '{}' },
      deploymentArtifacts: {
        availablePreviousVersions: ['v000001'],
        prepareRollbackTemplate: async (targetVersion, newVersion) => {
          events.push(`prepare:${targetVersion}:${newVersion}`);
          return 'https://example.com/rollback.yml';
        },
        restoreBucketSyncFromManifest: async (targetVersion) => {
          events.push(`restore:${targetVersion}`);
          throw new Error('manifest unavailable');
        },
        verifyArtifactsForVersion: async (targetVersion) => {
          events.push(`verify:${targetVersion}`);
        }
      },
      progress: { setPhase: (phase) => events.push(`phase:${phase}`) },
      stack: {
        deployStackForRollback: async (templateUrl) => {
          events.push(`deploy:${templateUrl}`);
        },
        lastVersion: 'v000002',
        nextVersion: 'v000003'
      },
      stackName: 'project-dev',
      tui: {
        createSpinner: ({ text }) => createSpinner(events, text),
        info: (message) => events.push(`info:${message}`),
        prettyStackName: (stackName) => stackName,
        warn: (message) => events.push(`warn:${message}`)
      }
    });

    expect(events).toContain('verify:v000001');
    expect(events).toContain('prepare:v000001:v000003');
    expect(events).toContain('deploy:https://example.com/rollback.yml');
    expect(events).toContain('restore:v000001');
    expect(events.some((event) => event.startsWith('warn:Could not restore bucket-synced content.'))).toBe(true);
    expect(events.indexOf('verify:v000001')).toBeLessThan(events.indexOf('prepare:v000001:v000003'));
    expect(events.indexOf('prepare:v000001:v000003')).toBeLessThan(
      events.indexOf('deploy:https://example.com/rollback.yml')
    );
    expect(events.indexOf('deploy:https://example.com/rollback.yml')).toBeLessThan(events.indexOf('restore:v000001'));
  });
});

describe('CloudFormation rollback lifecycle', () => {
  test('cleans deployment artifacts only after CloudFormation rollback succeeds', async () => {
    const events: string[] = [];

    await executeCloudFormationRollbackOperation({
      deploymentArtifacts: {
        deleteArtifactsRollbackedDeploy: async () => {
          events.push('cleanup');
        }
      },
      stack: {
        rollbackStack: async () => {
          events.push('rollback');
        }
      },
      stackName: 'project-dev',
      tui: {
        createSpinner: ({ text }) => createSpinner(events, text),
        prettyStackName: (stackName) => stackName
      }
    });

    expect(events.indexOf('rollback')).toBeLessThan(events.indexOf('cleanup'));
  });

  test('retains deployment artifacts when CloudFormation rollback fails', async () => {
    const events: string[] = [];
    const rollbackError = new Error('rollback failed');

    const operation = executeCloudFormationRollbackOperation({
      deploymentArtifacts: {
        deleteArtifactsRollbackedDeploy: async () => {
          events.push('cleanup');
        }
      },
      stack: {
        rollbackStack: async () => {
          events.push('rollback');
          throw rollbackError;
        }
      },
      stackName: 'project-dev',
      tui: {
        createSpinner: ({ text }) => createSpinner(events, text),
        prettyStackName: (stackName) => stackName
      }
    });

    await expect(operation).rejects.toBe(rollbackError);
    expect(events).not.toContain('cleanup');
  });
});
