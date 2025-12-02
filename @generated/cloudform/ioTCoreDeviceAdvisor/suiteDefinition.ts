import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DeviceUnderTest {
  ThingArn?: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: DeviceUnderTest) {
    Object.assign(this, properties);
  }
}

export class SuiteDefinitionConfiguration {
  DevicePermissionRoleArn!: Value<string>;
  SuiteDefinitionName?: Value<string>;
  IntendedForQualification?: Value<boolean>;
  Devices?: List<DeviceUnderTest>;
  RootGroup!: Value<string>;
  constructor(properties: SuiteDefinitionConfiguration) {
    Object.assign(this, properties);
  }
}
export interface SuiteDefinitionProperties {
  SuiteDefinitionConfiguration: SuiteDefinitionConfiguration;
  Tags?: List<ResourceTag>;
}
export default class SuiteDefinition extends ResourceBase<SuiteDefinitionProperties> {
  static DeviceUnderTest = DeviceUnderTest;
  static SuiteDefinitionConfiguration = SuiteDefinitionConfiguration;
  constructor(properties: SuiteDefinitionProperties) {
    super('AWS::IoTCoreDeviceAdvisor::SuiteDefinition', properties);
  }
}
