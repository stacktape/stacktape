import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectorProvisioningConfig {
  Lambda?: LambdaConnectorProvisioningConfig;
  constructor(properties: ConnectorProvisioningConfig) {
    Object.assign(this, properties);
  }
}

export class LambdaConnectorProvisioningConfig {
  LambdaArn!: Value<string>;
  constructor(properties: LambdaConnectorProvisioningConfig) {
    Object.assign(this, properties);
  }
}
export interface ConnectorProperties {
  ConnectorLabel?: Value<string>;
  ConnectorProvisioningType: Value<string>;
  Description?: Value<string>;
  ConnectorProvisioningConfig: ConnectorProvisioningConfig;
}
export default class Connector extends ResourceBase<ConnectorProperties> {
  static ConnectorProvisioningConfig = ConnectorProvisioningConfig;
  static LambdaConnectorProvisioningConfig = LambdaConnectorProvisioningConfig;
  constructor(properties: ConnectorProperties) {
    super('AWS::AppFlow::Connector', properties);
  }
}
