import type {
  NormalizedStackInfoMap,
  NormalizedStackInfoMapResource,
  StackInfoMap,
  StackInfoMapResource
} from './contracts';

const normalizeResource = <
  ResourceType extends string,
  Value,
  ReferenceableParameter extends string,
  Impact extends string,
  CloudformationResourceType extends string
>(
  resource: StackInfoMapResource<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>
): NormalizedStackInfoMapResource<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType> => {
  const { referencableParams, _nestedResources, ...unchangedResource } = resource;

  return {
    ...unchangedResource,
    referenceableParams: referencableParams,
    ...(_nestedResources
      ? {
          _nestedResources: Object.fromEntries(
            Object.entries(_nestedResources).map(([name, nestedResource]) => [name, normalizeResource(nestedResource)])
          )
        }
      : {})
  };
};

export const normalizeStackInfoMap = <
  ResourceType extends string,
  Value,
  ReferenceableParameter extends string,
  Impact extends string,
  CloudformationResourceType extends string,
  MetadataValue
>(
  stackInfoMap: StackInfoMap<
    ResourceType,
    Value,
    ReferenceableParameter,
    Impact,
    CloudformationResourceType,
    MetadataValue
  >
): NormalizedStackInfoMap<
  ResourceType,
  Value,
  ReferenceableParameter,
  Impact,
  CloudformationResourceType,
  MetadataValue
> => ({
  ...stackInfoMap,
  resources: Object.fromEntries(
    Object.entries(stackInfoMap.resources).map(([name, resource]) => [name, normalizeResource(resource)])
  )
});
