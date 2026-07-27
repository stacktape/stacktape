import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomDirectories {
  FailedFilesDirectory!: Value<string>;
  TemporaryFilesDirectory!: Value<string>;
  MdnFilesDirectory!: Value<string>;
  PayloadFilesDirectory!: Value<string>;
  StatusFilesDirectory!: Value<string>;
  constructor(properties: CustomDirectories) {
    Object.assign(this, properties);
  }
}
export interface AgreementProperties {
  Status?: Value<string>;
  Description?: Value<string>;
  BaseDirectory?: Value<string>;
  ServerId: Value<string>;
  CustomDirectories?: CustomDirectories;
  AccessRole: Value<string>;
  PartnerProfileId: Value<string>;
  LocalProfileId: Value<string>;
  EnforceMessageSigning?: Value<string>;
  PreserveFilename?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Agreement extends ResourceBase<AgreementProperties> {
  static CustomDirectories = CustomDirectories;
  constructor(properties: AgreementProperties) {
    super('AWS::Transfer::Agreement', properties);
  }
}
