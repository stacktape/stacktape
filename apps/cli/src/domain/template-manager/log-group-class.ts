import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { CliError } from '@utils/errors';

const STANDARD_CLASS = 'STANDARD';

const readLogGroupClass = (resource: CloudFormationTemplate['Resources'][string] | undefined): unknown => {
  if (!resource || resource.Type !== 'AWS::Logs::LogGroup') return undefined;
  const properties = resource.Properties as { LogGroupClass?: unknown };
  return properties.LogGroupClass ?? STANDARD_CLASS;
};

const classesMatch = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const referencesLogicalId = (value: unknown, logicalId: string): boolean => {
  if (Array.isArray(value)) return value.some((child) => referencesLogicalId(child, logicalId));
  if (!value || typeof value !== 'object') return false;

  const object = value as Record<string, unknown>;
  if (object.Ref === logicalId) return true;
  const getAtt = object['Fn::GetAtt'];
  if (Array.isArray(getAtt) && getAtt[0] === logicalId) return true;
  if (typeof getAtt === 'string' && getAtt.split('.')[0] === logicalId) return true;
  const substitution = object['Fn::Sub'];
  const substitutionTemplate =
    typeof substitution === 'string'
      ? substitution
      : Array.isArray(substitution) && typeof substitution[0] === 'string'
        ? substitution[0]
        : undefined;
  if (substitutionTemplate?.includes(`\${${logicalId}}`) || substitutionTemplate?.includes(`\${${logicalId}.`)) {
    return true;
  }
  return Object.values(object).some((child) => referencesLogicalId(child, logicalId));
};

export const validateInfrequentAccessSubscriptions = ({
  candidateTemplate
}: {
  candidateTemplate: CloudFormationTemplate;
}) => {
  const infrequentAccessLogGroups = Object.entries(candidateTemplate.Resources || {})
    .filter(([, resource]) => readLogGroupClass(resource) === 'INFREQUENT_ACCESS')
    .map(([logicalId, resource]) => ({
      logicalId,
      logGroupName: (resource.Properties as { LogGroupName?: unknown } | undefined)?.LogGroupName
    }));
  if (!infrequentAccessLogGroups.length) return;

  for (const [subscriptionLogicalId, resource] of Object.entries(candidateTemplate.Resources || {})) {
    if (resource.Type !== 'AWS::Logs::SubscriptionFilter') continue;
    const logGroupName = (resource.Properties as { LogGroupName?: unknown } | undefined)?.LogGroupName;
    const target = infrequentAccessLogGroups.find(
      ({ logicalId, logGroupName: managedLogGroupName }) =>
        referencesLogicalId(logGroupName, logicalId) ||
        (managedLogGroupName !== undefined && classesMatch(logGroupName, managedLogGroupName))
    );
    if (!target) continue;

    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_LOG_CLASS_SUBSCRIPTION_UNSUPPORTED',
      message: `CloudWatch subscription filter \`${subscriptionLogicalId}\` targets Infrequent Access log group \`${target.logicalId}\`, which does not support subscription filters.`,
      hints: [
        'Use `logging.logClass: standard` on the source resource when another function or service must subscribe to its logs.',
        'Otherwise, remove the CloudWatch log subscription and query the Infrequent Access group with Logs Insights.'
      ]
    });
  }
};

export const validateImmutableLogGroupClasses = ({
  previousTemplate,
  candidateTemplate
}: {
  previousTemplate: CloudFormationTemplate;
  candidateTemplate: CloudFormationTemplate;
}) => {
  for (const [logicalId, candidateResource] of Object.entries(candidateTemplate.Resources || {})) {
    const previousResource = previousTemplate.Resources?.[logicalId];
    const previousClass = readLogGroupClass(previousResource);
    const candidateClass = readLogGroupClass(candidateResource);
    if (previousClass === undefined || candidateClass === undefined || classesMatch(previousClass, candidateClass)) {
      continue;
    }

    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_LOG_GROUP_CLASS_IMMUTABLE',
      message: `CloudWatch log group \`${logicalId}\` already uses ${JSON.stringify(previousClass)} and cannot be changed to ${JSON.stringify(candidateClass)}.`,
      hints: [
        'CloudWatch fixes a log group class when the group is created.',
        'Keep the existing `logging.logClass`, or use Infrequent Access for a new resource or stage.'
      ]
    });
  }
};
