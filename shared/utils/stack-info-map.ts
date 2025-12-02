import { getStpNameForResource } from '@shared/naming/utils';

export const getCloudformationChildResources = <T extends StackInfoMapResource | DetailedStackResourceInfo>({
  resource
}: {
  resource: T;
}): T['cloudformationChildResources'] =>
  resource?._nestedResources
    ? Object.values(resource._nestedResources).reduce(
        (res, nr) => ({ ...res, ...getCloudformationChildResources({ resource: nr }) }),
        { ...(resource?.cloudformationChildResources || {}) }
      )
    : { ...(resource?.cloudformationChildResources || {}) };

export const traverseResourcesInMap = <T extends StackInfoMap | DetailedStackInfoMap>({
  stackInfoMapResources,
  nameChain,
  stpParentResourceType,
  applyFn
}: {
  stackInfoMapResources: T['resources'];
  nameChain?: string[];
  stpParentResourceType?: StpResourceType;
  applyFn: (resourceInfo: { resource: T['resources'][string]; nameChain: string[]; stpResourceName: string }) => void;
}) => {
  Object.entries(stackInfoMapResources || {}).forEach(([resourceInMapName, resource]) => {
    const resourceNameChain = [...(nameChain || []), resourceInMapName];
    if (resource?._nestedResources) {
      traverseResourcesInMap({
        stackInfoMapResources: resource._nestedResources,
        applyFn,
        nameChain: resourceNameChain
      });
    }
    applyFn({
      nameChain: resourceNameChain,
      resource,
      stpResourceName: getStpNameForResource({ nameChain: nameChain || [], parentResourceType: stpParentResourceType })
    });
  });
};
