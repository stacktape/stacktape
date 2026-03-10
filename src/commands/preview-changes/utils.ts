import type { ResourceDifference, TemplateDiff } from '@aws-cdk/cloudformation-diff';
import type { Change } from '@aws-sdk/client-cloudformation';
import { ResourceImpact, diffTemplate } from '@aws-cdk/cloudformation-diff';
import { outputNames } from '@shared/naming/stack-output-names';
import { PARENT_IDENTIFIER_CUSTOM_CF, PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { serialize } from '@shared/utils/misc';
import { getDetailedStackInfoMap } from '@utils/stack-info-map-diff';

export type PreviewResourceChange = {
  resourceName: string;
  resourceType: StackInfoMapResource['resourceType'];
  action: 'create' | 'delete' | 'replace' | 'update';
  highlights: string[];
  willReplace: string[];
  mayReplace: string[];
  changedChildCount: number;
};

const normalizePreviewTemplate = (template: CloudformationTemplate): CloudformationTemplate => {
  const normalizedTemplate = serialize(template);

  delete normalizedTemplate.Outputs?.[outputNames.deploymentVersion()];

  Object.values(normalizedTemplate.Resources || {}).forEach((resource: any) => {
    if (!resource?.Properties) {
      return;
    }

    delete resource.Properties.forceUpdate;

    if (
      resource.Type === 'AWS::CloudFormation::CustomResource' ||
      (typeof resource.Type === 'string' && resource.Type.startsWith('Custom::'))
    ) {
      const meaningfulPropKeys = Object.keys(resource.Properties).filter((key) => key !== 'ServiceToken');
      if (meaningfulPropKeys.length === 1 && meaningfulPropKeys[0] === 'version') {
        delete resource.Properties.version;
      }
      if (resource.Properties.defaultDomain?.version !== undefined) {
        delete resource.Properties.defaultDomain.version;
      }
      if (resource.Properties.defaultDomainCert?.version !== undefined) {
        delete resource.Properties.defaultDomainCert.version;
      }
    }
  });

  return normalizedTemplate;
};

export const getNormalizedPreviewTemplateDiff = ({
  oldTemplate,
  newTemplate
}: {
  oldTemplate: CloudformationTemplate;
  newTemplate: CloudformationTemplate;
}) => {
  return diffTemplate(normalizePreviewTemplate(oldTemplate), normalizePreviewTemplate(newTemplate));
};

const buildLogicalIdToResourcePathIndex = ({
  calculatedStackInfoMap,
  deployedStackInfoMap
}: {
  calculatedStackInfoMap?: StackInfoMap;
  deployedStackInfoMap?: StackInfoMap;
}) => {
  const logicalIdToResourcePath = new Map<string, string>();

  const indexResource = ({
    resourcePath,
    topLevelResourcePath,
    resource
  }: {
    resourcePath: string;
    topLevelResourcePath: string;
    resource?: StackInfoMapResource;
  }) => {
    if (!resource) {
      return;
    }
    Object.keys(resource.cloudformationChildResources || {}).forEach((cfLogicalName) => {
      logicalIdToResourcePath.set(cfLogicalName, topLevelResourcePath);
    });
    Object.entries(resource._nestedResources || {}).forEach(([nestedName, nestedResource]) => {
      indexResource({
        resourcePath: `${resourcePath}.${nestedName}`,
        topLevelResourcePath,
        resource: nestedResource
      });
    });
  };

  [calculatedStackInfoMap?.resources || {}, deployedStackInfoMap?.resources || {}].forEach((resourceMap) => {
    Object.entries(resourceMap).forEach(([resourceName, resource]) => {
      indexResource({ resourcePath: resourceName, topLevelResourcePath: resourceName, resource });
    });
  });

  return logicalIdToResourcePath;
};

const shortResourceType = (resourceType?: string) => resourceType?.replace('AWS::', '') || 'Unknown';

const getHighlightPriority = ({
  resourceDiff,
  cfChildResource
}: {
  resourceDiff?: ResourceDifference;
  cfChildResource: CfChildResourceOverview;
}) => {
  const resourceType =
    resourceDiff?.newResourceType || resourceDiff?.oldResourceType || cfChildResource.cloudformationResourceType;

  if (
    resourceType === 'AWS::Lambda::Function' ||
    resourceType === 'AWS::ECS::TaskDefinition' ||
    resourceType === 'AWS::DynamoDB::GlobalTable' ||
    resourceType === 'AWS::DynamoDB::Table' ||
    resourceType === 'AWS::ECS::Service' ||
    resourceType === 'AWS::ApiGatewayV2::Api'
  ) {
    return 0;
  }
  if (resourceDiff?.isAddition || resourceDiff?.isRemoval || cfChildResource.status === ResourceImpact.WILL_REPLACE) {
    return 1;
  }
  if (
    resourceType === 'AWS::CloudWatch::Alarm' ||
    resourceType === 'AWS::Events::Rule' ||
    resourceType === 'AWS::Lambda::Permission'
  ) {
    return 3;
  }
  return 2;
};

const getResourceDiff = ({ cfTemplateDiff, logicalId }: { cfTemplateDiff: TemplateDiff; logicalId: string }) => {
  return cfTemplateDiff.resources.logicalIds.includes(logicalId) ? cfTemplateDiff.resources.get(logicalId) : undefined;
};

const getChildHighlight = ({
  cfLogicalName,
  cfChildResource,
  resourceDiff
}: {
  cfLogicalName: string;
  cfChildResource: CfChildResourceOverview;
  resourceDiff?: ResourceDifference;
}) => {
  const childType = shortResourceType(
    resourceDiff?.newResourceType || resourceDiff?.oldResourceType || cfChildResource.cloudformationResourceType
  );

  if (resourceDiff?.isAddition) {
    return `${childType} added`;
  }
  if (resourceDiff?.isRemoval) {
    return `${childType} removed`;
  }
  if (resourceDiff?.resourceTypeChanged) {
    return `${cfLogicalName} type changed`;
  }

  const updatedProperties = Object.keys(resourceDiff?.propertyUpdates || {});
  if (updatedProperties.length) {
    return `${childType}: ${updatedProperties.slice(0, 4).join(', ')}`;
  }

  if (cfChildResource.status === ResourceImpact.WILL_REPLACE) {
    return `${childType} replaced`;
  }
  if (cfChildResource.status === ResourceImpact.WILL_DESTROY) {
    return `${childType} destroyed`;
  }

  return `${childType} changed`;
};

const collectChangedChildren = ({
  resource,
  cfTemplateDiff
}: {
  resource: DetailedStackResourceInfo;
  cfTemplateDiff: TemplateDiff;
}): {
  highlights: string[];
  changedChildLogicalIds: string[];
} => {
  const highlightEntries: { text: string; priority: number }[] = [];
  const changedChildLogicalIds: string[] = [];

  Object.entries(resource.cloudformationChildResources || {}).forEach(([cfLogicalName, cfChildResource]) => {
    if (cfChildResource.status === ResourceImpact.NO_CHANGE) {
      return;
    }
    changedChildLogicalIds.push(cfLogicalName);
    const resourceDiff = getResourceDiff({ cfTemplateDiff, logicalId: cfLogicalName });
    highlightEntries.push({
      text: getChildHighlight({ cfLogicalName, cfChildResource, resourceDiff }),
      priority: getHighlightPriority({ cfChildResource, resourceDiff })
    });
  });

  Object.values(resource._nestedResources || {}).forEach((nestedResource) => {
    const nestedChanges = collectChangedChildren({ resource: nestedResource, cfTemplateDiff });
    nestedChanges.highlights.forEach((highlight) => {
      highlightEntries.push({ text: highlight, priority: 2 });
    });
    changedChildLogicalIds.push(...nestedChanges.changedChildLogicalIds);
  });

  return {
    highlights: [
      ...new Map(
        highlightEntries.sort((a, b) => a.priority - b.priority).map((entry) => [entry.text, entry.text])
      ).values()
    ],
    changedChildLogicalIds: [...new Set(changedChildLogicalIds)]
  };
};

const buildAwsRiskIndex = ({
  changes,
  logicalIdToResourcePath
}: {
  changes: Change[];
  logicalIdToResourcePath: Map<string, string>;
}) => {
  const riskIndex = new Map<string, { willReplace: string[]; mayReplace: string[] }>();

  changes.forEach((change) => {
    const resourceChange = change.ResourceChange;
    const logicalId = resourceChange?.LogicalResourceId;
    if (!logicalId) {
      return;
    }
    const resourcePath = logicalIdToResourcePath.get(logicalId);
    if (!resourcePath) {
      return;
    }
    const currentRisk = riskIndex.get(resourcePath) || { willReplace: [], mayReplace: [] };
    const childLabel = `${logicalId} (${shortResourceType(resourceChange.ResourceType)})`;
    if (resourceChange.Replacement === 'True') {
      currentRisk.willReplace.push(childLabel);
    }
    if (resourceChange.Replacement === 'Conditional') {
      currentRisk.mayReplace.push(childLabel);
    }
    riskIndex.set(resourcePath, {
      willReplace: [...new Set(currentRisk.willReplace)],
      mayReplace: [...new Set(currentRisk.mayReplace)]
    });
  });

  return riskIndex;
};

export const buildPreviewResourceChanges = ({
  calculatedStackInfoMap,
  deployedStackInfoMap,
  cfTemplateDiff,
  changes
}: {
  calculatedStackInfoMap: StackInfoMap;
  deployedStackInfoMap: StackInfoMap;
  cfTemplateDiff: TemplateDiff;
  changes: Change[];
}): PreviewResourceChange[] => {
  const detailedStackInfoMap = getDetailedStackInfoMap({
    calculatedStackInfoMap,
    deployedStackInfoMap,
    showSensitiveValues: false,
    cfTemplateDiff
  });
  const logicalIdToResourcePath = buildLogicalIdToResourcePathIndex({ calculatedStackInfoMap, deployedStackInfoMap });
  const awsRiskIndex = buildAwsRiskIndex({ changes, logicalIdToResourcePath });

  return (Object.entries(detailedStackInfoMap.resources) as [string, DetailedStackResourceInfo][])
    .filter(([resourceName]) => resourceName !== PARENT_IDENTIFIER_CUSTOM_CF)
    .map(([resourceName, resource]) => {
      const { highlights, changedChildLogicalIds } = collectChangedChildren({ resource, cfTemplateDiff });
      const hasChanges = resource.status !== 'DEPLOYED' || changedChildLogicalIds.length > 0;
      if (!hasChanges) {
        return null;
      }

      const action =
        resource.status === 'TO_BE_CREATED'
          ? 'create'
          : resource.status === 'TO_BE_DELETED'
            ? 'delete'
            : resource.status === 'TO_BE_REPLACED'
              ? 'replace'
              : 'update';
      const resourcePathLabel = resourceName === PARENT_IDENTIFIER_SHARED_GLOBAL ? 'shared-global' : resourceName;
      const awsRisk = awsRiskIndex.get(resourceName) || { willReplace: [], mayReplace: [] };

      return {
        resourceName: resourcePathLabel,
        resourceType: resource.resourceType,
        action,
        highlights,
        willReplace: awsRisk.willReplace,
        mayReplace: awsRisk.mayReplace,
        changedChildCount: changedChildLogicalIds.length
      } satisfies PreviewResourceChange;
    })
    .filter((resource): resource is PreviewResourceChange => !!resource)
    .sort((a, b) => a.resourceName.localeCompare(b.resourceName));
};
