import { GetAtt } from '@cloudform/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION } from '@shared/utils/constants';
import { getEdgeLambdaCustomResource } from '../_utils/edge-lambdas';

export const resolveEdgeLambdaFunctions = () => {
  // edge lambda functions are created using SHARED custom resource which creates all edge lambda functions
  // you can find resolver for this custom resource in ../custom-resources/edge-lambdas-custom-resource.ts
  // in this resolver we are simply adding referencable parameters for each user code cdn lambda
  configManager.edgeLambdaFunctions.forEach((lambdaProps) => {
    resolveEdgeLambdaFunction({ lambdaProps });
  });
};

export const resolveEdgeLambdaFunction = ({ lambdaProps }: { lambdaProps: StpEdgeLambdaFunction }) => {
  const { nameChain } = lambdaProps;
  const { cfLogicalName, resource } = getEdgeLambdaCustomResource(lambdaProps);
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName,
    resource,
    nameChain
  });
  calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
    nameChain,
    paramName: 'arn',
    paramValue: GetAtt(cfLogicalNames.customResourceEdgeLambda(lambdaProps.name), 'versionArn')
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    nameChain,
    linkName: 'console',
    linkValue: cfEvaluatedLinks.lambda({
      awsLambdaName: lambdaProps.resourceName,
      tab: 'testing',
      region: 'us-east-1'
    })
  });

  REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION.forEach((region) =>
    calculatedStackOverviewManager.addStacktapeResourceLink({
      nameChain,
      linkName: `logs-${region}`,
      linkValue: cfEvaluatedLinks.logGroup(
        awsResourceNames.lambdaLogGroup({ lambdaAwsResourceName: lambdaProps.resourceName, edgeLambda: true }),
        region
      )
    })
  );
};
