import { globalStateManager } from '@application-services/global-state-manager';
import TargetGroup from '@cloudform/elasticLoadBalancingV2/targetGroup';
import LambdaPermission from '@cloudform/lambda/permission';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToApplicationLoadBalancer } from '@domain-services/config-manager/utils/application-load-balancers';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getListenerRule } from '../../../_utils/lb-listener-rule-helpers';
import { getTargetsForLambdaWorkloadEvents } from '../../utils';

export const resolveApplicationLoadBalancerEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, events, nameChain } = lambdaFunction;
  (events || []).forEach((event: ApplicationLoadBalancerIntegration) => {
    if (event.type === 'application-load-balancer') {
      const resolvedLbReference = resolveReferenceToApplicationLoadBalancer(event.properties, name);
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.listenerRule(
          resolvedLbReference.listenerPort,
          resolvedLbReference.loadBalancer.name,
          resolvedLbReference.priority
        ),
        resource: getListenerRule(name, resolvedLbReference),
        nameChain
      });
    }
  });

  getTargetsForLambdaWorkloadEvents({
    lambdaProps: lambdaFunction
  }).forEach((targetDetail: LambdaTargetDetails) => {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.targetGroup({
        stpResourceName: lambdaFunction.name,
        loadBalancerName: targetDetail.loadBalancerName
      }),
      resource: getLambdaTargetGroup(targetDetail),
      nameChain
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.lambdaTargetGroupPermission(lambdaFunction.name, targetDetail.loadBalancerName),
      resource: getLambdaTargetGroupPermission(targetDetail),
      nameChain
    });
  });

  return [];
};

const buildLambdaTargetGroupArnArtificially = (targetDetails: LambdaTargetDetails) =>
  `arn:aws:elasticloadbalancing:${globalStateManager.region}:${
    globalStateManager.targetAwsAccount.awsAccountId
  }:targetgroup/${awsResourceNames.lambdaTargetGroup(
    globalStateManager.targetStack.stackName,
    targetDetails.stpResourceName,
    targetDetails.loadBalancerName
  )}/*`;

const getLambdaTargetGroup = (targetDetails: LambdaTargetDetails) => {
  const target = new TargetGroup({
    TargetType: 'lambda',
    Targets: [
      {
        Id: targetDetails.lambdaEndpointArn
      }
    ],
    Name: awsResourceNames.lambdaTargetGroup(
      globalStateManager.targetStack.stackName,
      targetDetails.stpResourceName,
      targetDetails.loadBalancerName
    )
  });
  target.DependsOn = [
    cfLogicalNames.lambdaTargetGroupPermission(targetDetails.stpResourceName, targetDetails.loadBalancerName)
  ];
  return target;
};

const getLambdaTargetGroupPermission = (targetDetails: LambdaTargetDetails) =>
  new LambdaPermission({
    FunctionName: targetDetails.lambdaEndpointArn,
    Action: 'lambda:InvokeFunction',
    Principal: 'elasticloadbalancing.amazonaws.com',
    SourceArn: buildLambdaTargetGroupArnArtificially(targetDetails)
  });
