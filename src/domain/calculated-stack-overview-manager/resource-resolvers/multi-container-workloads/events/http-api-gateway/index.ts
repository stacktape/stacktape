import { globalStateManager } from '@application-services/global-state-manager';
import Integration from '@cloudform/apiGatewayV2/integration';
import { GetAtt, Ref } from '@cloudform/functions';
import ServiceDiscoveryService from '@cloudform/serviceDiscovery/service';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { ExpectedError } from '@utils/errors';
import { tuiManager } from '@utils/tui';
import {
  getHttpApiAuthorizerResource,
  getHttpApiLambdaPermission,
  getHttpApiRoute
} from '../../../_utils/http-api-events';

export const resolveHttpApiEvents = (definition: StpContainerWorkload) => {
  let explicitIntegrationPayloadFormat: StpHttpApiGateway['payloadFormat'];
  let targetedPort: number;
  const referencedHttpApiGateways = new Set<string>();
  definition.containers
    .map(({ events }) => (events || []).filter(({ type }) => type === 'http-api-gateway'))
    .flat()
    .forEach((event: ContainerWorkloadHttpApiIntegration) => {
      const { authorizer, method, path, httpApiGatewayName, payloadFormat } = event.properties;
      referencedHttpApiGateways.add(httpApiGatewayName);
      const httpApiGatewayInfo = resolveReferenceToHttpApiGateway({
        stpResourceReference: httpApiGatewayName,
        referencedFromType: definition.configParentResourceType as StpWorkloadType,
        referencedFrom: definition.name
      });
      const targetContainerPort = event.properties.containerPort;
      // if the payloadFormat was already set explicitly in the event, other events must use the same value
      if (explicitIntegrationPayloadFormat && explicitIntegrationPayloadFormat !== payloadFormat) {
        throw new ExpectedError(
          'CONFIG_VALIDATION',
          `Error in ${definition.type} "${definition.name}". All http-api-gateway event integrations must use the same "payloadFormat".`,
          [
            'You can set payload format globally for entire http-api-gateway by setting "payloadFormat" property in http-api-gateway config.'
          ]
        );
      }
      explicitIntegrationPayloadFormat = payloadFormat;
      // currently only one service registry item is allowed for ecs service
      if (targetedPort && targetedPort !== targetContainerPort) {
        throw new ExpectedError(
          'CONFIG_VALIDATION',
          `All http-api-gateway event integrations in ${tuiManager.prettyResourceType(
            definition.type
          )} ${tuiManager.prettyResourceName(definition.name)} must use the same container port.`,
          `This is an AWS limitation (only one Cloud Map service registry item per ECS service) and can change in the future.
    When using http-api-gateway event integration, you should use only a single container with a single port as an "entry point" to your ${definition.type}.
    This container can then route requests to other containers within your ${definition.type}.
    Alternatively, you can use Application Load Balancer for your event integration.`
        );
      }
      targetedPort = targetContainerPort;
      // adding route
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.httpApiRoute({
          method,
          path,
          stpResourceName: httpApiGatewayInfo.name
        }),
        nameChain: definition.nameChain,
        resource: getHttpApiRoute({ workloadName: definition.name, eventDetails: event.properties })
      });
      const authorizerName = awsResourceNames.httpApiAuthorizer({
        stackName: globalStateManager.targetStack.stackName,
        workloadName: definition.name,
        path,
        method,
        stpResourceName: httpApiGatewayInfo.name
      });
      if (authorizer) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.httpApiAuthorizer({
            path,
            method,
            stpResourceName: httpApiGatewayInfo.name
          }),
          nameChain: definition.nameChain,
          resource: getHttpApiAuthorizerResource(event.properties.authorizer, authorizerName, httpApiGatewayInfo.name)
        });
        if (authorizer.type === 'lambda') {
          const authorizerLambdaProps = resolveReferenceToLambdaFunction({
            stpResourceReference: authorizer.properties.functionName,
            referencedFrom: definition.name
          });

          const authorizerLambdaEndpointArn = authorizerLambdaProps.aliasLogicalName
            ? Ref(authorizerLambdaProps.aliasLogicalName)
            : GetAtt(authorizerLambdaProps.cfLogicalName, 'Arn');
          // `${arns.lambdaFromFullName({
          //   accountId: globalStateManager.targetAwsAccount.awsAccountId,
          //   lambdaAwsName: authorizerLambdaProps.resourceName,
          //   region: globalStateManager.region
          // })}${authorizerLambdaProps.aliasLogicalName ? `:${awsResourceNames.lambdaStpAlias()}` : ''}`;

          const authorizerLambdaPermissionLogicalName = cfLogicalNames.httpApiLambdaPermission({
            stpResourceNameOfLambda: authorizerLambdaProps.name,
            stpResourceNameOfHttpApiGateway: httpApiGatewayName
          });

          if (!templateManager.getCfResourceFromTemplate(authorizerLambdaPermissionLogicalName)) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: authorizerLambdaPermissionLogicalName,
              nameChain: authorizerLambdaProps.nameChain,
              resource: getHttpApiLambdaPermission({
                lambdaEndpointArn: authorizerLambdaEndpointArn,
                stpResourceName: httpApiGatewayName
              })
            });
          }
        }
      }
    });
  // new integration must be created for each gateway
  // there will be at most one integration per gateway for the given workload, because each compute resource can only have one port as targeted port
  Array.from(referencedHttpApiGateways).forEach((stpHttpApiGatewayReference) => {
    const httpApiGatewayInfo = resolveReferenceToHttpApiGateway({
      stpResourceReference: stpHttpApiGatewayReference,
      referencedFromType: definition.type,
      referencedFrom: definition.name
    });
    const httpApiContainerWorkloadIntegrationLogicalName = cfLogicalNames.httpApiContainerWorkloadIntegration({
      stpResourceName: definition.name,
      stpHttpApiGatewayName: httpApiGatewayInfo.name,
      targetContainerPort: targetedPort
    });

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: httpApiContainerWorkloadIntegrationLogicalName,
      nameChain: definition.nameChain,
      resource: getHttpApiContainerWorkloadIntegration({
        workloadName: definition.name,
        workloadType: definition.type,
        payloadFormat:
          explicitIntegrationPayloadFormat || (httpApiGatewayInfo as StpHttpApiGateway).payloadFormat || '1.0',
        stpHttpApiGatewayName: httpApiGatewayInfo.name,
        targetedPort
      })
    });
  });
  // if there is at least one http-api-gateway trigger we must create discovery service
  // there cannot be more than one discovery service per compute resource due to AWS limitations.
  if (Array.from(referencedHttpApiGateways).length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.serviceDiscoveryEcsService(definition.name, targetedPort),
      nameChain: definition.nameChain,
      resource: getServiceDiscoveryEcsService()
    });
  }
};

const getHttpApiContainerWorkloadIntegration = ({
  workloadName,
  workloadType,
  payloadFormat,
  stpHttpApiGatewayName,
  targetedPort
}: {
  workloadName: string;
  workloadType: StpWorkloadType;
  stpHttpApiGatewayName: string;
  targetedPort: number;
  payloadFormat: StpHttpApiGateway['payloadFormat'];
}) => {
  if (payloadFormat !== '1.0') {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${workloadType} "${workloadName}". ${workloadType} http-api-gateway events only support payload format version "1.0".`,
      [
        'Set payload format version by setting "payloadFormat" property in http-api-gateway event.',
        'Optionally, you can set payload format for entire http-api-gateway by setting "payloadFormat" property in http-api-gateway config.'
      ]
    );
  }
  return new Integration({
    ApiId: Ref(cfLogicalNames.httpApi(stpHttpApiGatewayName)),
    IntegrationType: 'HTTP_PROXY',
    IntegrationUri: GetAtt(cfLogicalNames.serviceDiscoveryEcsService(workloadName, Number(targetedPort)), 'Arn'),
    ConnectionId: Ref(cfLogicalNames.httpApiVpcLink(stpHttpApiGatewayName)),
    ConnectionType: 'VPC_LINK',
    IntegrationMethod: 'ANY',
    PayloadFormatVersion: payloadFormat
  });
};

const getServiceDiscoveryEcsService = () => {
  return new ServiceDiscoveryService({
    // Name: awsResourceNames.serviceDiscoveryEcsService(globalStateManager.targetStack.stackName, workloadName, targetContainerPort),
    DnsConfig: {
      RoutingPolicy: 'MULTIVALUE',
      DnsRecords: [{ TTL: 60, Type: 'SRV' }]
    },
    HealthCheckCustomConfig: {
      FailureThreshold: 1
    },
    NamespaceId: Ref(cfLogicalNames.serviceDiscoveryPrivateNamespace())
  });
};
