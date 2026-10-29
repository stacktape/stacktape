import type { StackStatus } from '@aws-sdk/client-cloudformation';
import { CliError } from '@utils/errors';

type RollbackSettings = {
  autoRollback?: boolean;
  triggerRollbackOnAlarms?: string[];
  monitoringTimeAfterDeploymentInMinutes?: number;
};

/** Rollback alarms and the monitoring period only work when CloudFormation may roll the deploy back. */
const usesRollbackMonitoring = ({
  triggerRollbackOnAlarms,
  monitoringTimeAfterDeploymentInMinutes
}: RollbackSettings) => !!triggerRollbackOnAlarms?.length || (monitoringTimeAfterDeploymentInMinutes ?? 0) > 0;

/**
 * Whether CloudFormation rolls a failed deploy back. By default it does not: a failed first deploy keeps what it created
 * (a database takes minutes) and a failed update keeps the resources that updated, so the next deploy continues from the
 * failure. Rollback alarms and a monitoring period turn automatic rollback on. `autoRollback` (in the config, or the
 * `--auto-rollback` flag for one deploy) sets it explicitly. Dev mode keeps rolling back unless the config says otherwise.
 */
export const resolveAutoRollback = ({
  deploymentConfig,
  cliValue,
  isDevCommand
}: {
  deploymentConfig: RollbackSettings | undefined;
  cliValue?: boolean;
  isDevCommand?: boolean;
}): boolean => {
  const settings = deploymentConfig ?? {};
  const explicit = cliValue ?? settings.autoRollback;
  if (explicit === false && usesRollbackMonitoring(settings)) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_AUTO_ROLLBACK_REQUIRED',
      message:
        '`deploymentConfig.triggerRollbackOnAlarms` and `deploymentConfig.monitoringTimeAfterDeploymentInMinutes` roll a failed deploy back, so automatic rollback cannot be turned off while either is set.',
      hints: [
        'Remove `autoRollback: false` (or `--auto-rollback=false`), or remove the rollback alarms and the monitoring period.'
      ]
    });
  }
  if (explicit !== undefined) return explicit;
  if (isDevCommand) return true;
  return usesRollbackMonitoring(settings);
};

/** States an earlier deploy without automatic rollback leaves. CloudFormation continues them only with rollback off. */
export const FAILED_STACK_STATUSES: readonly string[] = ['CREATE_FAILED', 'UPDATE_FAILED'] satisfies StackStatus[];

export const isFailedStackStatus = (status: string | undefined) => !!status && FAILED_STACK_STATUSES.includes(status);
