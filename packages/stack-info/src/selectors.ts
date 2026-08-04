import type { CloudformationChildResourceOverview, NormalizedStackInfoMap } from './contracts';

export const getUserResourcesFromStackInfoMap = (stackInfoMap: NormalizedStackInfoMap | null) => {
  if (!stackInfoMap) {
    return [];
  }

  const {
    CUSTOM_CLOUDFORMATION: _customCloudformation,
    SHARED_GLOBAL: _sharedGlobal,
    ...otherResources
  } = stackInfoMap.resources;

  return Object.entries(otherResources)
    .map(([name, data]) => Object.assign({ name }, data))
    .filter(
      ({ name, resourceType }) =>
        name !== 'stacktapeServiceLambda' &&
        resourceType !== 'CUSTOM_CLOUDFORMATION' &&
        resourceType !== 'SHARED_GLOBAL'
    )
    .map((resource) => {
      let nestedCloudformationResources: {
        [logicalName: string]: Omit<CloudformationChildResourceOverview, 'status' | 'referenceableParams'>;
      } = {};

      for (const nestedResource of Object.values(resource['_nestedResources'] ?? {})) {
        Object.assign(nestedCloudformationResources, nestedResource.cloudformationChildResources);
      }

      return Object.assign({}, resource, {
        cloudformationChildResources: {
          ...resource.cloudformationChildResources,
          ...nestedCloudformationResources
        }
      });
    });
};

export type StackInfoQuickLink = {
  resourceName: string;
  url: string;
  resourceType: string;
};

const QUICK_LINK_RESOURCE_TYPES = new Set([
  'http-api-gateway',
  'bucket',
  'application-load-balancer',
  'web-service',
  'hosting-bucket',
  'nextjs-web'
]);

export const getQuickLinks = (stackInfoMap: NormalizedStackInfoMap | null): StackInfoQuickLink[] =>
  getUserResourcesFromStackInfoMap(stackInfoMap).flatMap((resource) => {
    if (!QUICK_LINK_RESOURCE_TYPES.has(resource.resourceType)) {
      return [];
    }

    const firstUrl = [
      resource.referenceableParams.cdnCustomDomainUrls,
      resource.referenceableParams.cdnUrl,
      resource.referenceableParams.customDomainUrls,
      resource.referenceableParams.url
    ].find((parameter) => typeof parameter?.value === 'string');

    return typeof firstUrl?.value === 'string' && firstUrl.value
      ? [
          {
            resourceName: resource.name,
            url: firstUrl.value,
            resourceType: resource.resourceType
          }
        ]
      : [];
  });

export type StackInfoResourceLink = {
  resourceName: string;
  linkName: string;
  linkValue: string;
  resourceType: string;
};

const getResourcesWithSpecificLinks = ({
  linkNamePrefix,
  stackInfoMap
}: {
  linkNamePrefix: 'logs' | 'metrics';
  stackInfoMap: NormalizedStackInfoMap | null;
}): StackInfoResourceLink[] =>
  getUserResourcesFromStackInfoMap(stackInfoMap).flatMap(({ name, links, resourceType }) =>
    Object.entries(links ?? {})
      .filter(([linkName]) => linkName.startsWith(linkNamePrefix))
      .map(([linkName, linkValue]) => ({
        resourceName: name,
        linkName,
        linkValue: linkValue as string,
        resourceType
      }))
  );

export const getResourcesWithMetrics = ({ stackInfoMap }: { stackInfoMap: NormalizedStackInfoMap | null }) =>
  getResourcesWithSpecificLinks({ linkNamePrefix: 'metrics', stackInfoMap });

export const getResourcesWithLogs = ({ stackInfoMap }: { stackInfoMap: NormalizedStackInfoMap | null }) =>
  getResourcesWithSpecificLinks({ linkNamePrefix: 'logs', stackInfoMap }).map((resource) =>
    Object.assign({}, resource, {
      logGroupName: resource.linkValue.split('/log-group/')[1]!.replaceAll('%252F', '/')
    })
  );
