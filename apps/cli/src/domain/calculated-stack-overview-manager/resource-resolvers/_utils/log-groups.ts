import type { CloudWatchLogGroupOptions, LogForwardingBase } from '@stacktape/config/log-forwarding';
import { CliError } from '@utils/errors';

export const getCloudFormationLogGroupClass = (
  logClass: CloudWatchLogGroupOptions['logClass']
): 'INFREQUENT_ACCESS' | undefined => (logClass === 'infrequent-access' ? 'INFREQUENT_ACCESS' : undefined);

export const getCloudFormationLogGroupClassProperties = (logClass: CloudWatchLogGroupOptions['logClass']) => {
  const cloudFormationClass = getCloudFormationLogGroupClass(logClass);
  return cloudFormationClass ? { LogGroupClass: cloudFormationClass } : {};
};

export const logClassSupportsSubscriptionFilters = (logClass: CloudWatchLogGroupOptions['logClass']) =>
  logClass !== 'infrequent-access';

export const assertLogClassSupportsForwarding = ({
  logClass,
  logForwarding
}: {
  logClass: CloudWatchLogGroupOptions['logClass'];
  logForwarding: LogForwardingBase['logForwarding'];
}) => {
  if (logClassSupportsSubscriptionFilters(logClass) || !logForwarding) return;

  throw new CliError({
    category: 'CONFIG_VALIDATION',
    code: 'CONFIG_LOG_CLASS_FORWARDING_UNSUPPORTED',
    message: 'CloudWatch Logs Infrequent Access cannot be combined with log forwarding.',
    hints: [
      'Remove `logging.logForwarding`, or use `logging.logClass: standard`.',
      'AWS does not support subscription filters on Infrequent Access log groups.'
    ]
  });
};
