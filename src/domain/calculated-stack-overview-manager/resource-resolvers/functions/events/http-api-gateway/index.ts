import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import Integration from '@cloudform/apiGatewayV2/integration';
import { GetAtt, Ref } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { resolveReferenceToHttpApiGateway } from '@domain-services/config-manager/utils/http-api-gateways';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { ExpectedError } from '@utils/errors';
import {
  getHttpApiAuthorizerResource,
  getHttpApiLambdaPermission,
  getHttpApiRoute
} from '../../../_utils/http-api-events';

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
        throw new ExpectedError(
          'CONFIG_VALIDATION',
          `Error in function compute resource ${tuiManager.prettyResourceName(name)}. All http-api-gateway events for a function must use the same ${tuiManager.prettyConfigProperty('payloadFormat')}.`,
          [
            `You can set payload format globally for entire ${tuiManager.prettyResourceType('http-api-gateway')} by setting ${tuiManager.prettyConfigProperty('payloadFormat')} property in the ${tuiManager.prettyResourceType('http-api-gateway')}  config.`
          ]
        );
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
        stackName: globalStateManager.targetStack.stackName,
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
        workloadName: name,
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
  workloadName,
  functionTimeout,
  lambdaEndpointArn,
  httpApiGatewayInfo,
  payloadFormat
}: {
  workloadName: string;
  functionTimeout: number;
  lambdaEndpointArn: string | IntrinsicFunction;
  payloadFormat: StpHttpApiGateway['payloadFormat'];
  httpApiGatewayInfo: StpHttpApiGateway & { name: string };
}) => {
  if (functionTimeout > 29) {
    tuiManager.warn(
      `Function compute resource (${workloadName}) timeout setting (${functionTimeout}) is greater than ` +
        'maximum allowed timeout for HTTP API endpoint (29s).\n' +
        'This may introduce a situation where endpoint times out ' +
        'for a successful function invocation.'
    );
  }
  if (functionTimeout === 29) {
    tuiManager.warn(
      `Function compute resource (${workloadName}) timeout setting (${functionTimeout}) may not provide ` +
        'enough room to process an HTTP API request (of which timeout is limited to 29s). ' +
        'This may introduce a situation where endpoint times out ' +
        'for a successful function invocation.'
    );
  }
  return new Integration({
    ApiId: Ref(cfLogicalNames.httpApi(httpApiGatewayInfo.name)),
    IntegrationType: 'AWS_PROXY',
    IntegrationUri: lambdaEndpointArn,
    TimeoutInMillis: Math.round(Math.min(functionTimeout + 0.5, 29) * 1000),
    PayloadFormatVersion: payloadFormat
  });
};
