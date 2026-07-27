import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SseSpecification {
  CustomerManagedKeyEnabled?: Value<boolean>;
  KmsKeyArn?: Value<string>;
  constructor(properties: SseSpecification) {
    Object.assign(this, properties);
  }
}
export interface VerifiedAccessGroupProperties {
  Description?: Value<string>;
  PolicyDocument?: Value<string>;
  SseSpecification?: SseSpecification;
  VerifiedAccessInstanceId: Value<string>;
  Tags?: List<ResourceTag>;
  PolicyEnabled?: Value<boolean>;
}
export default class VerifiedAccessGroup extends ResourceBase<VerifiedAccessGroupProperties> {
  static SseSpecification = SseSpecification;
  constructor(properties: VerifiedAccessGroupProperties) {
    super('AWS::EC2::VerifiedAccessGroup', properties);
  }
}
