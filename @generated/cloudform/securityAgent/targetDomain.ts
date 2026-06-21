import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DnsVerification {
  Token?: Value<string>;
  DnsRecordType?: Value<string>;
  DnsRecordName?: Value<string>;
  constructor(properties: DnsVerification) {
    Object.assign(this, properties);
  }
}

export class HttpVerification {
  RoutePath?: Value<string>;
  Token?: Value<string>;
  constructor(properties: HttpVerification) {
    Object.assign(this, properties);
  }
}

export class VerificationDetails {
  HttpRoute?: HttpVerification;
  DnsTxt?: DnsVerification;
  Method?: Value<string>;
  constructor(properties: VerificationDetails) {
    Object.assign(this, properties);
  }
}
export interface TargetDomainProperties {
  VerificationMethod: Value<string>;
  TargetDomainName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TargetDomain extends ResourceBase<TargetDomainProperties> {
  static DnsVerification = DnsVerification;
  static HttpVerification = HttpVerification;
  static VerificationDetails = VerificationDetails;
  constructor(properties: TargetDomainProperties) {
    super('AWS::SecurityAgent::TargetDomain', properties);
  }
}
