import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfig {
  KmsKeyArn?: Value<string>;
  AWSOwnedKey?: Value<boolean>;
  constructor(properties: EncryptionConfig) {
    Object.assign(this, properties);
  }
}

export class FipsEndpoints {
  CollectionEndpoint?: Value<string>;
  DashboardEndpoint?: Value<string>;
  constructor(properties: FipsEndpoints) {
    Object.assign(this, properties);
  }
}

export class VectorOptions {
  ServerlessVectorAcceleration?: Value<string>;
  constructor(properties: VectorOptions) {
    Object.assign(this, properties);
  }
}
export interface CollectionProperties {
  Type?: Value<string>;
  Description?: Value<string>;
  StandbyReplicas?: Value<string>;
  CollectionGroupName?: Value<string>;
  EncryptionConfig?: EncryptionConfig;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  VectorOptions?: VectorOptions;
}
export default class Collection extends ResourceBase<CollectionProperties> {
  static EncryptionConfig = EncryptionConfig;
  static FipsEndpoints = FipsEndpoints;
  static VectorOptions = VectorOptions;
  constructor(properties: CollectionProperties) {
    super('AWS::OpenSearchServerless::Collection', properties);
  }
}
