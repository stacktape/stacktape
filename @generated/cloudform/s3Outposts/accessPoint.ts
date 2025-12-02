import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class VpcConfiguration {
  VpcId?: Value<string>;
  constructor(properties: VpcConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AccessPointProperties {
  Policy?: { [key: string]: any };
  Bucket: Value<string>;
  VpcConfiguration: VpcConfiguration;
  Name: Value<string>;
}
export default class AccessPoint extends ResourceBase<AccessPointProperties> {
  static VpcConfiguration = VpcConfiguration;
  constructor(properties: AccessPointProperties) {
    super('AWS::S3Outposts::AccessPoint', properties);
  }
}
