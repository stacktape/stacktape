import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { StpHttpApiGateway } from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import Integration from '@cloudform/apiGatewayV2/integration';
import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { CliError } from '@utils/errors';
import {
  getHttpApiAuthorizerResource,
  getHttpApiLambdaPermission,
  getHttpApiRoute
} from '../../../_utils/http-api-events';
import type { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { StpIamRoleStatement } from '@stacktape/config/shared';

export const resolveHttpApiEvents = ({
  lambdaFunction
}: {
  lambdaFunction: StpLambdaFunction | StpHelperLambdaFunction;
}): StpIamRoleStatement[] => {
  const { name, cfLogicalName, aliasLogicalName, events, configParentResourceType, nameChain, timeout } =
    lambdaFunction;
  const referencedHttpApiGateways = new Set<string>();
  let integrationPayloadFormat: StpHttpApiGateway['payloadFormat'];
  (events || []).forEach((event) => {
    if (event.type === 'http-api-gateway') {
      const { authorizer, method, path, httpApiGatewayName, payloadFormat } = event.properties;
      referencedHttpApiGateways.add(httpApiGatewayName);
      const httpApiGatewayInfo = resolveReferenceToHttpApiGateway({
        stpResourceReference: httpApiGatewayName,
        referencedFromType: configParentResourceType as StpWorkloadType,
        referencedFrom: name
      });
      const routePayloadFormat = payloadFormat || (httpApiGatewayInfo as StpHttpApiGateway).payloadFormat || '1.0';
      // if the payloadFormat was already set explicitly in the event, other events must use the same value
      if (integrationPayloadFormat && integrationPayloadFormat !== routePayloadFormat) {
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_HTTP_API_PAYLOAD_FORMAT_CONFLICT',
          message: `All HTTP API events on function \`${name}\` must use the same \`payloadFormat\`.`,
          hints: 'Set `payloadFormat` consistently on the events or once on the referenced `http-api-gateway`.'
        });
      }
      integrationPayloadFormat = routePayloadFormat;
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.httpApiRoute({
          method,
          path,
          stpResourceName: httpApiGatewayInfo.name
        }),
        nameChain,
        resource: getHttpApiRoute({ workloadName: name, eventDetails: event.properties })
      });
      const authorizerName = awsResourceNames.httpApiAuthorizer({
        stackName: calculatedStackOverviewManager.context.stackName,
        workloadName: name,
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
          nameChain,
          resource: getHttpApiAuthorizerResource(event.properties.authorizer, authorizerName, httpApiGatewayInfo.name)
        });
        if (authorizer.type === 'lambda') {
          const authorizerLambdaProps = resolveReferenceToLambdaFunction({
            stpResourceReference: authorizer.properties.functionName,
            referencedFrom: name,
            referencedFromType: 'multi-container-workload'
          });

          const authorizerLambdaEndpointArn = authorizerLambdaProps.aliasLogicalName
            ? Ref(authorizerLambdaProps.aliasLogicalName)
            : GetAtt(authorizerLambdaProps.cfLogicalName, 'Arn');

          // `${arns.lambdaFromFullName({
          //   accountId: calculatedStackOverviewManager.context.accountId,
          //   lambdaAwsName: authorizerLambdaProps.resourceName,
          //   region: calculatedStackOverviewManager.context.region
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
    }
  });
  const lambdaEndpointArn = aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn');
  Array.from(referencedHttpApiGateways).forEach((stpHttpApiGatewayReference) => {
    const httpApiGatewayInfo = resolveReferenceToHttpApiGateway({
      stpResourceReference: stpHttpApiGatewayReference,
      referencedFromType: configParentResourceType as StpWorkloadType,
      referencedFrom: name
    });

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.httpApiLambdaIntegration({
        stpResourceName: name,
        stpHttpApiGatewayName: httpApiGatewayInfo.name
      }),
      nameChain,
      resource: getHttpApiLambdaIntegration({
        lambdaEndpointArn,
        functionTimeout: timeout,
        httpApiGatewayInfo,
        payloadFormat: integrationPayloadFormat
      })
    });
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.httpApiLambdaPermission({
        stpResourceNameOfLambda: name,
        stpResourceNameOfHttpApiGateway: httpApiGatewayInfo.name
      }),
      nameChain,
      resource: getHttpApiLambdaPermission({
        lambdaEndpointArn,
        stpResourceName: httpApiGatewayInfo.name
      })
    });
  });

  return [];
};

const getHttpApiLambdaIntegration = ({
  functionTimeout,
  lambdaEndpointArn,
  httpApiGatewayInfo,
  payloadFormat
}: {
  functionTimeout: number;
  lambdaEndpointArn: string | IntrinsicFunction;
  payloadFormat: StpHttpApiGateway['payloadFormat'];
  httpApiGatewayInfo: StpHttpApiGateway & { name: string };
}) => {
  return new Integration({
    ApiId: Ref(cfLogicalNames.httpApi(httpApiGatewayInfo.name)),
    IntegrationType: 'AWS_PROXY',
    IntegrationUri: lambdaEndpointArn,
    TimeoutInMillis: Math.round(Math.min(functionTimeout + 0.5, 29) * 1000),
    PayloadFormatVersion: payloadFormat
  });
};
