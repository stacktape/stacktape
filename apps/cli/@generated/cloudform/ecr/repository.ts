import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  EncryptionType!: Value<string>;
  KmsKey?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class ImageScanningConfiguration {
  ScanOnPush?: Value<boolean>;
  constructor(properties: ImageScanningConfiguration) {
    Object.assign(this, properties);
  }
}

export class ImageTagMutabilityExclusionFilter {
  ImageTagMutabilityExclusionFilterType!: Value<string>;
  ImageTagMutabilityExclusionFilterValue!: Value<string>;
  constructor(properties: ImageTagMutabilityExclusionFilter) {
    Object.assign(this, properties);
  }
}

export class LifecyclePolicy {
  LifecyclePolicyText?: Value<string>;
  RegistryId?: Value<string>;
  constructor(properties: LifecyclePolicy) {
    Object.assign(this, properties);
  }
}
export interface RepositoryProperties {
  EmptyOnDelete?: Value<boolean>;
  ImageScanningConfiguration?: ImageScanningConfiguration;
  ImageTagMutabilityExclusionFilters?: List<ImageTagMutabilityExclusionFilter>;
  EncryptionConfiguration?: EncryptionConfiguration;
  RepositoryPolicyText?: { [key: string]: any };
  LifecyclePolicy?: LifecyclePolicy;
  RepositoryName?: Value<string>;
  Tags?: List<ResourceTag>;
  ImageTagMutability?: Value<string>;
}
export default class Repository extends ResourceBase<RepositoryProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static ImageScanningConfiguration = ImageScanningConfiguration;
  static ImageTagMutabilityExclusionFilter = ImageTagMutabilityExclusionFilter;
  static LifecyclePolicy = LifecyclePolicy;
  constructor(properties?: RepositoryProperties) {
    super('AWS::ECR::Repository', properties || {});
  }
}
