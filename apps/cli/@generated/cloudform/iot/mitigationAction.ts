import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ActionParams {
  UpdateDeviceCertificateParams?: UpdateDeviceCertificateParams;
  AddThingsToThingGroupParams?: AddThingsToThingGroupParams;
  PublishFindingToSnsParams?: PublishFindingToSnsParams;
  EnableIoTLoggingParams?: EnableIoTLoggingParams;
  ReplaceDefaultPolicyVersionParams?: ReplaceDefaultPolicyVersionParams;
  UpdateCACertificateParams?: UpdateCACertificateParams;
  constructor(properties: ActionParams) {
    Object.assign(this, properties);
  }
}

export class AddThingsToThingGroupParams {
  OverrideDynamicGroups?: Value<boolean>;
  ThingGroupNames!: List<Value<string>>;
  constructor(properties: AddThingsToThingGroupParams) {
    Object.assign(this, properties);
  }
}

export class EnableIoTLoggingParams {
  RoleArnForLogging!: Value<string>;
  LogLevel!: Value<string>;
  constructor(properties: EnableIoTLoggingParams) {
    Object.assign(this, properties);
  }
}

export class PublishFindingToSnsParams {
  TopicArn!: Value<string>;
  constructor(properties: PublishFindingToSnsParams) {
    Object.assign(this, properties);
  }
}

export class ReplaceDefaultPolicyVersionParams {
  TemplateName!: Value<string>;
  constructor(properties: ReplaceDefaultPolicyVersionParams) {
    Object.assign(this, properties);
  }
}

export class UpdateCACertificateParams {
  Action!: Value<string>;
  constructor(properties: UpdateCACertificateParams) {
    Object.assign(this, properties);
  }
}

export class UpdateDeviceCertificateParams {
  Action!: Value<string>;
  constructor(properties: UpdateDeviceCertificateParams) {
    Object.assign(this, properties);
  }
}
export interface MitigationActionProperties {
  ActionName?: Value<string>;
  ActionParams: ActionParams;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class MitigationAction extends ResourceBase<MitigationActionProperties> {
  static ActionParams = ActionParams;
  static AddThingsToThingGroupParams = AddThingsToThingGroupParams;
  static EnableIoTLoggingParams = EnableIoTLoggingParams;
  static PublishFindingToSnsParams = PublishFindingToSnsParams;
  static ReplaceDefaultPolicyVersionParams = ReplaceDefaultPolicyVersionParams;
  static UpdateCACertificateParams = UpdateCACertificateParams;
  static UpdateDeviceCertificateParams = UpdateDeviceCertificateParams;
  constructor(properties: MitigationActionProperties) {
    super('AWS::IoT::MitigationAction', properties);
  }
}
