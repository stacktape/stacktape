import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface CertificateProviderProperties {
  LambdaFunctionArn: Value<string>;
  CertificateProviderName?: Value<string>;
  AccountDefaultForOperations: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class CertificateProvider extends ResourceBase<CertificateProviderProperties> {
  constructor(properties: CertificateProviderProperties) {
    super('AWS::IoT::CertificateProvider', properties);
  }
}
