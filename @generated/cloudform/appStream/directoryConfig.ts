import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CertificateBasedAuthProperties {
  Status?: Value<string>;
  CertificateAuthorityArn?: Value<string>;
  constructor(properties: CertificateBasedAuthProperties) {
    Object.assign(this, properties);
  }
}

export class ServiceAccountCredentials {
  AccountName!: Value<string>;
  AccountPassword!: Value<string>;
  constructor(properties: ServiceAccountCredentials) {
    Object.assign(this, properties);
  }
}
export interface DirectoryConfigProperties {
  OrganizationalUnitDistinguishedNames: List<Value<string>>;
  ServiceAccountCredentials: ServiceAccountCredentials;
  CertificateBasedAuthProperties?: CertificateBasedAuthProperties;
  DirectoryName: Value<string>;
}
export default class DirectoryConfig extends ResourceBase<DirectoryConfigProperties> {
  static CertificateBasedAuthProperties = CertificateBasedAuthProperties;
  static ServiceAccountCredentials = ServiceAccountCredentials;
  constructor(properties: DirectoryConfigProperties) {
    super('AWS::AppStream::DirectoryConfig', properties);
  }
}
