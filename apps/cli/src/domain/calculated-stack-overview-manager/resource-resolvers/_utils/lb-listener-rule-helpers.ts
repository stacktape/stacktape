import type {
  Action,
  RuleCondition
} from '@stacktape/cloudformation/resources/aws-elasticloadbalancingv2-listenerrule';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { ref } from '@stacktape/cloudformation/intrinsics';
import type { StpResolvedLoadBalancerReference } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { ExpectedError } from '@utils/errors';

const getActionsForListenerRule = (workloadName: string, resolvedLbReference: StpResolvedLoadBalancerReference) => {
  const actions: Action[] = [];
  let order = 1;
  // here we will add authorizer action once we will have authorizers
  // here add also other types of default rules in the future
  actions.push({
    Type: 'forward',
    Order: order++,
    TargetGroupArn: ref(
      cfLogicalNames.targetGroup({
        stpResourceName: workloadName,
        loadBalancerName: resolvedLbReference.loadBalancer.name,
        targetContainerPort: resolvedLbReference.containerPort
      })
    )
  });

  return actions;
};

// const normalizeToArray = (argument: string | string[]): string[] => [argument].flat();

const getConditionsForListenerRule = (resolvedLbReference: StpResolvedLoadBalancerReference, workloadName: string) => {
  const result: RuleCondition[] = [];
  if (
    !resolvedLbReference.paths &&
    !resolvedLbReference.headers &&
    !resolvedLbReference.hosts &&
    !resolvedLbReference.methods &&
    !resolvedLbReference.queryParams &&
    !resolvedLbReference.sourceIps
  ) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in workload: ${workloadName}. At least one of the "paths", "headers", "hosts", "methods", "queryParams" or "sourceIps" properties must be present when using loadBalancer event integration.`
    );
  }
  if (resolvedLbReference.paths) {
    result.push({ Field: 'path-pattern', PathPatternConfig: { Values: resolvedLbReference.paths } });
  }
  if (resolvedLbReference.headers) {
    resolvedLbReference.headers.forEach(({ headerName, values }) => {
      result.push({
        Field: 'http-header',
        HttpHeaderConfig: { HttpHeaderName: headerName, Values: values }
      });
    });
  }
  if (resolvedLbReference.methods) {
    result.push({
      Field: 'http-request-method',
      HttpRequestMethodConfig: { Values: resolvedLbReference.methods }
    });
  }
  if (resolvedLbReference.hosts) {
    result.push({
      Field: 'host-header',
      HostHeaderConfig: { Values: resolvedLbReference.hosts }
    });
  }
  if (resolvedLbReference.sourceIps) {
    result.push({
      Field: 'source-ip',
      SourceIpConfig: { Values: resolvedLbReference.sourceIps }
    });
  }
  if (resolvedLbReference.queryParams) {
    resolvedLbReference.queryParams.forEach(({ paramName, values }) => {
      const queryArr = values.map((paramValue) => {
        return { Key: paramName, Value: paramValue };
      });
      result.push({
        Field: 'query-string',
        QueryStringConfig: {
          Values: queryArr
        }
      });
    });
  }
  return result;
};

export const getListenerRule = (
  workloadName: string,
  resolvedLbReference: StpResolvedLoadBalancerReference,
  ecsBlueGreen?: boolean
) => {
  const resource = cfnResource('AWS::ElasticLoadBalancingV2::ListenerRule', {
    Actions: getActionsForListenerRule(workloadName, resolvedLbReference),
    Conditions: getConditionsForListenerRule(resolvedLbReference, workloadName),
    Priority: resolvedLbReference.priority,
    ListenerArn: ref(cfLogicalNames.listener(resolvedLbReference.listenerPort, resolvedLbReference.loadBalancer.name))
  });
  if (ecsBlueGreen) {
    resource.DependsOn = ((resource.DependsOn as string[]) || []).concat([
      cfLogicalNames.targetGroup({
        loadBalancerName: resolvedLbReference.loadBalancer.name,
        targetContainerPort: resolvedLbReference.containerPort,
        stpResourceName: workloadName,
        blueGreen: true
      })
    ]);
  }
  return resource;
};
