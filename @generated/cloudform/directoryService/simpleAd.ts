import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class VpcSettings {
  VpcId!: Value<string>;
  SubnetIds!: List<Value<string>>;
  constructor(properties: VpcSettings) {
    Object.assign(this, properties);
  }
}
export interface SimpleADProperties {
  Description?: Value<string>;
  VpcSettings: VpcSettings;
  Size: Value<string>;
  CreateAlias?: Value<boolean>;
  EnableSso?: Value<boolean>;
  ShortName?: Value<string>;
  Name: Value<string>;
  Password?: Value<string>;
}
export default class SimpleAD extends ResourceBase<SimpleADProperties> {
  static VpcSettings = VpcSettings;
  constructor(properties: SimpleADProperties) {
    super('AWS::DirectoryService::SimpleAD', properties);
  }
}
