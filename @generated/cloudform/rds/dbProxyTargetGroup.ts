import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConnectionPoolConfigurationInfoFormat {
  MaxIdleConnectionsPercent?: Value<number>;
  MaxConnectionsPercent?: Value<number>;
  InitQuery?: Value<string>;
  ConnectionBorrowTimeout?: Value<number>;
  SessionPinningFilters?: List<Value<string>>;
  constructor(properties: ConnectionPoolConfigurationInfoFormat) {
    Object.assign(this, properties);
  }
}
export interface DBProxyTargetGroupProperties {
  DBProxyName: Value<string>;
  DBInstanceIdentifiers?: List<Value<string>>;
  TargetGroupName: Value<string>;
  ConnectionPoolConfigurationInfo?: ConnectionPoolConfigurationInfoFormat;
  DBClusterIdentifiers?: List<Value<string>>;
}
export default class DBProxyTargetGroup extends ResourceBase<DBProxyTargetGroupProperties> {
  static ConnectionPoolConfigurationInfoFormat = ConnectionPoolConfigurationInfoFormat;
  constructor(properties: DBProxyTargetGroupProperties) {
    super('AWS::RDS::DBProxyTargetGroup', properties);
  }
}
