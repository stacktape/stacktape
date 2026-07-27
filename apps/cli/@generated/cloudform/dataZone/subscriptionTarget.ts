import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class SubscriptionTargetForm {
  Content!: Value<string>;
  FormName!: Value<string>;
  constructor(properties: SubscriptionTargetForm) {
    Object.assign(this, properties);
  }
}
export interface SubscriptionTargetProperties {
  Type: Value<string>;
  EnvironmentIdentifier: Value<string>;
  ManageAccessRole?: Value<string>;
  SubscriptionTargetConfig: List<SubscriptionTargetForm>;
  ApplicableAssetTypes: List<Value<string>>;
  AuthorizedPrincipals: List<Value<string>>;
  Name: Value<string>;
  Provider?: Value<string>;
  DomainIdentifier: Value<string>;
}
export default class SubscriptionTarget extends ResourceBase<SubscriptionTargetProperties> {
  static SubscriptionTargetForm = SubscriptionTargetForm;
  constructor(properties: SubscriptionTargetProperties) {
    super('AWS::DataZone::SubscriptionTarget', properties);
  }
}
