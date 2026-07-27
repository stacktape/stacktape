import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class VpcSettings {
  SubnetIds!: List<Value<string>>;
  VpcId!: Value<string>;
  constructor(properties: VpcSettings) {
    Object.assign(this, properties);
  }
}
export interface MicrosoftADProperties {
  CreateAlias?: Value<boolean>;
  Edition?: Value<string>;
  EnableSso?: Value<boolean>;
  Name: Value<string>;
  Password: Value<string>;
  ShortName?: Value<string>;
  VpcSettings: VpcSettings;
}
export default class MicrosoftAD extends ResourceBase<MicrosoftADProperties> {
  static VpcSettings = VpcSettings;
  constructor(properties: MicrosoftADProperties) {
    super('AWS::DirectoryService::MicrosoftAD', properties);
  }
}
