import { isDeepStrictEqual } from 'node:util';
import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { getAtt, ref, sub } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';

import cronValidate from 'aws-cron-validate';

/**
 * The target of an EventBridge rule that invokes a function.
 *
 * CloudFormation spends about a minute creating any `AWS::Events::Rule` (and about 30 seconds deleting one), whatever it
 * targets. EventBridge accepts a target that does not exist yet, so a rule that names the function by its ARN is created
 * while CloudFormation creates the function, instead of after it. That matters most for a function in a VPC, whose
 * network interfaces take minutes. The rule's permission still references the function, so nothing can invoke it before
 * both exist.
 *
 * A rule that is already deployed with a reference keeps it: switching would update every deployed rule for the same
 * ARN. A function behind an alias keeps the alias reference, because the alias is created from a published version.
 */
export const getLambdaRuleTargetArn = ({
  lambdaFunction,
  ruleLogicalName
}: {
  lambdaFunction: Pick<
    StpLambdaFunction | StpHelperLambdaFunction,
    'cfLogicalName' | 'aliasLogicalName' | 'resourceName'
  >;
  ruleLogicalName: string;
}): Intrinsic => {
  const { cfLogicalName, aliasLogicalName, resourceName } = lambdaFunction;
  const reference = aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn');
  if (aliasLogicalName || !resourceName) {
    return reference;
  }
  const byArn = sub(`arn:\${AWS::Partition}:lambda:\${AWS::Region}:\${AWS::AccountId}:function:${resourceName}`);
  if (calculatedStackOverviewManager.context.command === 'dev') {
    return byArn;
  }
  const deployedRule = templateManager.oldTemplate.Resources?.[ruleLogicalName];
  const deployedTargets = (deployedRule?.Properties as { Targets?: unknown } | undefined)?.Targets;
  const deployedTargetArn = Array.isArray(deployedTargets) ? (deployedTargets[0] as { Arn?: unknown })?.Arn : undefined;
  return isDeepStrictEqual(deployedTargetArn, reference) ? reference : byArn;
};

export const getEventBusRuleLambdaPermission = ({
  lambdaEndpointArn,
  eventBusRuleArn
}: {
  lambdaEndpointArn: string | Intrinsic;
  eventBusRuleArn: string | Intrinsic;
}) => {
  return cfnResource('AWS::Lambda::Permission', {
    Action: 'lambda:InvokeFunction',
    Principal: 'events.amazonaws.com',
    FunctionName: lambdaEndpointArn,
    SourceArn: eventBusRuleArn
  });
};

const filterInternalStringsFromMessage = (msg: string) => {
  return msg.replace(' when mustHaveBlankDayField option is enabled.', '');
};

export const validateScheduleSyntax = (input: string): string[] => {
  if (input.includes('rate(')) {
    return /^rate\((?:1 (?:minute|hour|day)|(?:1\d+|[2-9]\d*) (?:minute|hour|day)s)\)$/.test(input)
      ? null
      : ['Must be a valid rate syntax.'];
  }
  if (input.includes('cron(')) {
    try {
      return cronValidate(input.slice(5, -1)).getError().map(filterInternalStringsFromMessage);
    } catch {
      return null;
    }
  }
  return ['Must be either rate(<<FormInput>>) or cron(<<FormInput>>) syntax.'];
};
