import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  EncryptionType!: Value<string>;
  KmsKey?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
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
export interface RepositoryCreationTemplateProperties {
  ImageTagMutabilityExclusionFilters?: List<ImageTagMutabilityExclusionFilter>;
  CustomRoleArn?: Value<string>;
  Description?: Value<string>;
  EncryptionConfiguration?: EncryptionConfiguration;
  ResourceTags?: List<ResourceTag>;
  RepositoryPolicy?: Value<string>;
  LifecyclePolicy?: Value<string>;
  AppliedFor: List<Value<string>>;
  Prefix: Value<string>;
  ImageTagMutability?: Value<string>;
}
export default class RepositoryCreationTemplate extends ResourceBase<RepositoryCreationTemplateProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static ImageTagMutabilityExclusionFilter = ImageTagMutabilityExclusionFilter;
  constructor(properties: RepositoryCreationTemplateProperties) {
    super('AWS::ECR::RepositoryCreationTemplate', properties);
  }
}
