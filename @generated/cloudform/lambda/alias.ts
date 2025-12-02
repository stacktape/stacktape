import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AliasRoutingConfiguration {
  AdditionalVersionWeights?: List<VersionWeight>;
  constructor(properties: AliasRoutingConfiguration) {
    Object.assign(this, properties);
  }
}

export class ProvisionedConcurrencyConfiguration {
  ProvisionedConcurrentExecutions!: Value<number>;
  constructor(properties: ProvisionedConcurrencyConfiguration) {
    Object.assign(this, properties);
  }
}

export class VersionWeight {
  FunctionVersion!: Value<string>;
  FunctionWeight!: Value<number>;
  constructor(properties: VersionWeight) {
    Object.assign(this, properties);
  }
}
export interface AliasProperties {
  FunctionName: Value<string>;
  ProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfiguration;
  Description?: Value<string>;
  FunctionVersion: Value<string>;
  RoutingConfig?: AliasRoutingConfiguration;
  Name: Value<string>;
}
export default class Alias extends ResourceBase<AliasProperties> {
  static AliasRoutingConfiguration = AliasRoutingConfiguration;
  static ProvisionedConcurrencyConfiguration = ProvisionedConcurrencyConfiguration;
  static VersionWeight = VersionWeight;
  constructor(properties: AliasProperties) {
    super('AWS::Lambda::Alias', properties);
  }
}
