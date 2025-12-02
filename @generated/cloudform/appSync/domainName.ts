import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DomainNameProperties {
  Description?: Value<string>;
  DomainName: Value<string>;
  Tags?: List<ResourceTag>;
  CertificateArn: Value<string>;
}
export default class DomainName extends ResourceBase<DomainNameProperties> {
  constructor(properties: DomainNameProperties) {
    super('AWS::AppSync::DomainName', properties);
  }
}
