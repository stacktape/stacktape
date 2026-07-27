import type { TemplateDiff } from '@aws-cdk/cloudformation-diff';
import type { CloudformationResourceType } from '@cloudform/resource-types';
import { ResourceImpact } from '@aws-cdk/cloudformation-diff';
import { PARENT_IDENTIFIER_CUSTOM_CF, PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { serialize } from '@shared/utils/misc';
import { getCloudformationChildResources } from '@shared/utils/stack-info-map';
import { getAllReferencableParams } from '@utils/referenceable-types';

export const calculateComplexResourceMap = ({
  calculatedResourceMap,
  deployedResourceMap,
  cfTemplateDiff,
  showSensitiveValues
}: {
  calculatedResourceMap?: StackInfoMap['resources'];
  deployedResourceMap?: StackInfoMap['resources'];
  cfTemplateDiff?: TemplateDiff;
  showSensitiveValues: boolean;
}): { [key: string]: DetailedStackResourceInfo } => {
  const resultResourceMap: { [resourceResourceName: string]: DetailedStackResourceInfo } = {};
  [...Object.keys(calculatedResourceMap || {}), ...Object.keys(deployedResourceMap || {})].forEach(
    (mapResourceName) => {
      resultResourceMap[mapResourceName] = processResource({
        calculatedResourceInfo:
          calculatedResourceMap?.[mapResourceName] && serialize(calculatedResourceMap?.[mapResourceName]),
        deployedResourceInfo:
          deployedResourceMap?.[mapResourceName] && serialize(deployedResourceMap?.[mapResourceName]),
        cfTemplateDiff,
        showSensitiveValues
      });
    }
  );
  return resultResourceMap;
};

const processResource = ({
  calculatedResourceInfo,
  deployedResourceInfo,
  cfTemplateDiff,
  showSensitiveValues
}: {
  calculatedResourceInfo?: StackInfoMapResource;
  deployedResourceInfo?: StackInfoMapResource;
  cfTemplateDiff?: TemplateDiff;
  showSensitiveValues: boolean;
}): DetailedStackResourceInfo => {
  const hasNestedResources = !!(calculatedResourceInfo?._nestedResources || deployedResourceInfo?._nestedResources);
  return {
    status: calculateResourceStatus({ calculatedResourceInfo, deployedResourceInfo }),
    afterUpdateResourceType: calculateResourceAfterDeployType({ calculatedResourceInfo, deployedResourceInfo }),
    cloudformationChildResources: calculateCfChildResourcesOverviews({
      calculatedResourceInfo,
      deployedResourceInfo,
      cfTemplateDiff
    }),
    links: adjustLinks({ calculatedResourceInfo, deployedResourceInfo }),
    outputs: deployedResourceInfo?.outputs || {},
    referenceableParams: adjustReferenceableParams({
      calculatedResourceInfo,
      deployedResourceInfo,
      showSensitiveValues
    }),
    resourceType: deployedResourceInfo?.resourceType || calculatedResourceInfo?.resourceType,
    _nestedResources: hasNestedResources
      ? calculateComplexResourceMap({
          calculatedResourceMap: calculatedResourceInfo?._nestedResources,
          deployedResourceMap: deployedResourceInfo?._nestedResources,
          cfTemplateDiff,
          showSensitiveValues
        })
      : undefined
  };
};

const calculateCfChildResourcesOverviews = ({
  calculatedResourceInfo,
  deployedResourceInfo,
  cfTemplateDiff
}: {
  calculatedResourceInfo?: StackInfoMapResource;
  deployedResourceInfo?: StackInfoMapResource;
  cfTemplateDiff?: TemplateDiff;
}): {
  [cfLogicalName: string]: CfChildResourceOverview;
} => {
  const resources: {
    [cfLogicalName: string]: CfChildResourceOverview;
  } = {};
  [
    ...Object.entries(calculatedResourceInfo?.cloudformationChildResources || {}),
    ...Object.entries(deployedResourceInfo?.cloudformationChildResources || {})
  ].forEach(([cfResourceName, { cloudformationResourceType }]) => {
    if (cfTemplateDiff) {
      const diffedResource =
        cfTemplateDiff.resources.logicalIds.includes(cfResourceName) && cfTemplateDiff.resources.get(cfResourceName);
      resources[cfResourceName] = {
        status: diffedResource?.changeImpact || ResourceImpact.NO_CHANGE,
        cloudformationResourceType: (diffedResource?.oldResourceType ||
          diffedResource?.newResourceType ||
          cloudformationResourceType) as CloudformationResourceType,
        referenceableParams: getAllReferencableParams(diffedResource?.oldResourceType || cloudformationResourceType),
        afterUpdateResourceType: diffedResource?.resourceTypeChanged
          ? (diffedResource?.newResourceType as CloudformationResourceType)
          : undefined
      };
    } else {
      resources[cfResourceName] = {
        status: ResourceImpact.NO_CHANGE,
        cloudformationResourceType:
          deployedResourceInfo.cloudformationChildResources[cfResourceName]?.cloudformationResourceType,
        referenceableParams: getAllReferencableParams(
          deployedResourceInfo.cloudformationChildResources[cfResourceName]?.cloudformationResourceType
        )
      };
    }
  });
  return resources;
};

const adjustReferenceableParams = ({
  calculatedResourceInfo,
  deployedResourceInfo,
  showSensitiveValues
}: {
  calculatedResourceInfo?: StackInfoMapResource;
  deployedResourceInfo?: StackInfoMapResource;
  showSensitiveValues?: boolean;
}): DetailedStackResourceInfo['referenceableParams'] => {
  const modifiedReferencableParams: DetailedStackResourceInfo['referenceableParams'] = {};
  Object.keys(calculatedResourceInfo?.referencableParams || {}).forEach((paramName) => {
    modifiedReferencableParams[paramName] = '<<unknown>>';
  });
  Object.entries(deployedResourceInfo?.referencableParams || {}).forEach(([paramName, { value, ssmParameterName }]) => {
    if (ssmParameterName && !showSensitiveValues) {
      modifiedReferencableParams[paramName] = '<<OMITTED>>';
    } else {
      modifiedReferencableParams[paramName] = value;
    }
  });
  return modifiedReferencableParams;
};

const adjustLinks = ({
  calculatedResourceInfo,
  deployedResourceInfo
}: {
  calculatedResourceInfo?: StackInfoMapResource;
  deployedResourceInfo?: StackInfoMapResource;
}): { [linkName: string]: string } => {
  const links = {};
  Object.keys(calculatedResourceInfo?.links || {}).forEach((linkName) => {
    links[linkName] = '<<unknown>>';
  });
  Object.keys(deployedResourceInfo?.links || {}).forEach((linkName) => {
    links[linkName] = deployedResourceInfo.links[linkName];
  });
  return links;
};

const calculateResourceAfterDeployType = ({
  calculatedResourceInfo,
  deployedResourceInfo
}: {
  calculatedResourceInfo?: StackInfoMapResource;
  deployedResourceInfo?: StackInfoMapResource;
}): DetailedStackResourceInfo['resourceType'] => {
  return calculatedResourceInfo &&
    deployedResourceInfo &&
    calculatedResourceInfo.resourceType !== deployedResourceInfo.resourceType
    ? calculatedResourceInfo.resourceType
    : undefined;
};

const calculateResourceStatus = ({
  calculatedResourceInfo,
  deployedResourceInfo
}: {
  calculatedResourceInfo?: StackInfoMapResource;
  deployedResourceInfo?: StackInfoMapResource;
}): DetailedStackResourceInfo['status'] => {
  if (!calculatedResourceInfo) {
    return 'TO_BE_DELETED';
  }
  if (!deployedResourceInfo) {
    return 'TO_BE_CREATED';
  }
  if (deployedResourceInfo.resourceType === calculatedResourceInfo.resourceType) {
    return 'DEPLOYED';
  }
  return 'TO_BE_REPLACED';
};

export const getCriticalResourcesPotentiallyEndangeredByOperation = ({
  calculatedStackInfoMap,
  deployedStackInfoMap,
  cfTemplateDiff
}: // existingStackResources
{
  calculatedStackInfoMap: StackInfoMap;
  deployedStackInfoMap: StackInfoMap;
  cfTemplateDiff: TemplateDiff;
  // existingStackResources: EnrichedStackResourceInfo[];
}) => {
  const possiblyImpactedResources: {
    stpResourceName: string;
    resourceType: string;
    impactedCfResources: {
      [cfLogicalName: string]: {
        cfResourceType: CloudformationResourceType | SupportedPrivateCfResourceType;
        impact: ResourceImpact;
      };
    };
  }[] = []; // ResourceWithPhysicalId[] = [];
  const detailedStackInfo = getDetailedStackInfoMap({
    calculatedStackInfoMap,
    deployedStackInfoMap,
    cfTemplateDiff,
    showSensitiveValues: false
  });
  const cfResourceTypesToWatch: (CloudformationResourceType | SupportedPrivateCfResourceType)[] = [
    'AWS::RDS::DBCluster',
    'AWS::RDS::DBInstance',
    'AWS::DynamoDB::GlobalTable',
    'AWS::DynamoDB::Table',
    'AWS::ElastiCache::GlobalReplicationGroup',
    'AWS::S3::Bucket',
    'MongoDB::StpAtlasV1::Cluster',
    'AWS::Cognito::UserPool',
    'Upstash::DatabasesV1::Database',
    'AWS::OpenSearchService::Domain',
    'AWS::EFS::FileSystem'
  ];
  Object.entries(detailedStackInfo.resources).forEach(([stpResourceName, { resourceType }]) => {
    if (stpResourceName === PARENT_IDENTIFIER_SHARED_GLOBAL || stpResourceName === PARENT_IDENTIFIER_CUSTOM_CF) {
      return;
    }
    const allCfChildResources = getCloudformationChildResources({
      resource: detailedStackInfo.resources[stpResourceName]
    });
    const criticalCfResourcesWithDangerousImpact = Object.entries(allCfChildResources).filter(
      ([, { cloudformationResourceType, status: cfResourceStatus }]) => {
        return (
          cfResourceTypesToWatch.includes(cloudformationResourceType) &&
          // for now MAY_REPLACE we do not consider as it triggers lots of false positives
          // all of the critical resources (relational databases, dynamo tables, redis clusters...) are custom named anyway, so they cannot get easily replaced
          (cfResourceStatus === ResourceImpact.WILL_REPLACE || cfResourceStatus === ResourceImpact.WILL_DESTROY)
        ); // cfResourceStatus === ResourceImpact.MAY_REPLACE
      }
    );

    if (criticalCfResourcesWithDangerousImpact.length) {
      possiblyImpactedResources.push({
        stpResourceName,
        resourceType,
        impactedCfResources: criticalCfResourcesWithDangerousImpact.reduce(
          (obj, [cfLogicalName, { cloudformationResourceType, status }]) => ({
            ...obj,
            [cfLogicalName]: { cfResourceType: cloudformationResourceType, impact: status }
          }),
          {}
        )
      });
    }
  });
  return possiblyImpactedResources;
};

export const getDetailedStackInfoMap = ({
  calculatedStackInfoMap,
  deployedStackInfoMap,
  showSensitiveValues,
  cfTemplateDiff
}: {
  calculatedStackInfoMap?: StackInfoMap;
  deployedStackInfoMap?: StackInfoMap;
  showSensitiveValues: boolean;
  cfTemplateDiff?: TemplateDiff;
}): DetailedStackInfoMap => {
  let customOutputs = deployedStackInfoMap?.customOutputs;
  // if we do not have user defined outputs from deployed stack, we go through calculated and list them as unknown
  if (!customOutputs) {
    customOutputs = {};
    Object.keys(calculatedStackInfoMap.customOutputs).forEach((outputName) => {
      customOutputs[outputName] = '<<unknown>>';
    });
  }
  const metadata: StackMetadata = {
    // @todo
    name: null,
    createdTime: null,
    lastUpdatedTime: null
  };

  Object.entries(deployedStackInfoMap?.metadata || {}).forEach(([metaName, { value }]) => {
    metadata[metaName] = value;
  });

  return {
    metadata,
    customOutputs,
    resources: calculateComplexResourceMap({
      calculatedResourceMap: cfTemplateDiff ? calculatedStackInfoMap.resources : deployedStackInfoMap.resources,
      deployedResourceMap: deployedStackInfoMap?.resources,
      cfTemplateDiff,
      showSensitiveValues
    })
  };
};
