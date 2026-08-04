export type StackInfoValue = string | number | boolean | StackInfoValue[] | { [property: string]: StackInfoValue };

export type StackInfoResourceType = string;

export type StackInfoResourceStatus = 'DEPLOYED' | 'TO_BE_CREATED' | 'TO_BE_DELETED' | 'TO_BE_REPLACED';

export type StackInfoReferenceableParameter<Value = StackInfoValue> = {
  showDuringPrint: boolean;
  value: Value;
  ssmParameterName?: string;
};

export type CloudformationChildResourceOverview<
  Impact extends string = string,
  CloudformationResourceType extends string = string
> = {
  cloudformationResourceType: CloudformationResourceType;
  status: Impact;
  referenceableParams: string[];
  afterUpdateResourceType?: CloudformationResourceType;
};

export type StackInfoMapResource<
  ResourceType extends string = StackInfoResourceType,
  Value = StackInfoValue,
  ReferenceableParameter extends string = string,
  Impact extends string = string,
  CloudformationResourceType extends string = string
> = {
  resourceType: ResourceType | 'SHARED_GLOBAL' | 'CUSTOM_CLOUDFORMATION';
  /**
   * Historical wire spelling. This field is embedded in already-deployed CloudFormation stack outputs.
   */
  referencableParams: Partial<Record<ReferenceableParameter, StackInfoReferenceableParameter<Value>>>;
  cloudformationChildResources: Record<
    string,
    Omit<CloudformationChildResourceOverview<Impact, CloudformationResourceType>, 'status' | 'referenceableParams'>
  >;
  links: Record<string, Value>;
  outputs: Record<string, unknown>;
  _nestedResources?: Record<
    string,
    StackInfoMapResource<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>
  >;
};

export type StackInfoMap<
  ResourceType extends string = StackInfoResourceType,
  Value = StackInfoValue,
  ReferenceableParameter extends string = string,
  Impact extends string = string,
  CloudformationResourceType extends string = string,
  MetadataValue = Value
> = {
  metadata: Record<string, { showDuringPrint: boolean; value: MetadataValue }>;
  resources: Record<
    string,
    StackInfoMapResource<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>
  >;
  customOutputs: Record<string, Value>;
};

export type NormalizedStackInfoMapResource<
  ResourceType extends string = StackInfoResourceType,
  Value = StackInfoValue,
  ReferenceableParameter extends string = string,
  Impact extends string = string,
  CloudformationResourceType extends string = string
> = Omit<
  StackInfoMapResource<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>,
  'referencableParams' | '_nestedResources'
> & {
  referenceableParams: Partial<Record<ReferenceableParameter, StackInfoReferenceableParameter<Value>>>;
  _nestedResources?: Record<
    string,
    NormalizedStackInfoMapResource<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>
  >;
};

export type NormalizedStackInfoMap<
  ResourceType extends string = StackInfoResourceType,
  Value = StackInfoValue,
  ReferenceableParameter extends string = string,
  Impact extends string = string,
  CloudformationResourceType extends string = string,
  MetadataValue = Value
> = Omit<
  StackInfoMap<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType, MetadataValue>,
  'resources'
> & {
  resources: Record<
    string,
    NormalizedStackInfoMapResource<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>
  >;
};

export type DetailedStackResourceInfo<
  ResourceType extends string = StackInfoResourceType,
  Value = StackInfoValue,
  ReferenceableParameter extends string = string,
  Impact extends string = string,
  CloudformationResourceType extends string = string
> = Omit<
  StackInfoMapResource<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>,
  'referencableParams' | '_nestedResources'
> & {
  status: StackInfoResourceStatus;
  afterUpdateResourceType?: ResourceType | 'SHARED_GLOBAL' | 'CUSTOM_CLOUDFORMATION';
  referenceableParams: Partial<Record<ReferenceableParameter, Value>>;
  cloudformationChildResources: Record<string, CloudformationChildResourceOverview<Impact, CloudformationResourceType>>;
  _nestedResources?: Record<
    string,
    DetailedStackResourceInfo<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>
  >;
};

export type DetailedStackInfoMap<
  ResourceType extends string = StackInfoResourceType,
  Value = StackInfoValue,
  ReferenceableParameter extends string = string,
  Impact extends string = string,
  CloudformationResourceType extends string = string
> = {
  metadata: Record<string, Value | Date>;
  resources: Record<
    string,
    DetailedStackResourceInfo<ResourceType, Value, ReferenceableParameter, Impact, CloudformationResourceType>
  >;
  customOutputs: Record<string, Value>;
};
