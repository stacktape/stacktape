import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SqlHaStandbyDetectedInstanceProperties {
  SqlServerCredentials?: Value<string>;
  InstanceId: Value<string>;
}
export default class SqlHaStandbyDetectedInstance extends ResourceBase<SqlHaStandbyDetectedInstanceProperties> {
  constructor(properties: SqlHaStandbyDetectedInstanceProperties) {
    super('AWS::EC2::SqlHaStandbyDetectedInstance', properties);
  }
}
