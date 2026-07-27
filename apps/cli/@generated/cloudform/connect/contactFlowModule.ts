import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ExternalInvocationConfiguration {
  Enabled!: Value<boolean>;
  constructor(properties: ExternalInvocationConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ContactFlowModuleProperties {
  ExternalInvocationConfiguration?: ExternalInvocationConfiguration;
  Description?: Value<string>;
  Content: Value<string>;
  State?: Value<string>;
  InstanceArn: Value<string>;
  Tags?: List<ResourceTag>;
  Settings?: Value<string>;
  Name: Value<string>;
}
export default class ContactFlowModule extends ResourceBase<ContactFlowModuleProperties> {
  static ExternalInvocationConfiguration = ExternalInvocationConfiguration;
  constructor(properties: ContactFlowModuleProperties) {
    super('AWS::Connect::ContactFlowModule', properties);
  }
}
