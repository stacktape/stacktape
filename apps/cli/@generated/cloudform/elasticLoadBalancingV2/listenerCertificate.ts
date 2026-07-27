import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Certificate {
  CertificateArn?: Value<string>;
  constructor(properties: Certificate) {
    Object.assign(this, properties);
  }
}
export interface ListenerCertificateProperties {
  Certificates: List<Certificate>;
  ListenerArn: Value<string>;
}
export default class ListenerCertificate extends ResourceBase<ListenerCertificateProperties> {
  static Certificate = Certificate;
  constructor(properties: ListenerCertificateProperties) {
    super('AWS::ElasticLoadBalancingV2::ListenerCertificate', properties);
  }
}
