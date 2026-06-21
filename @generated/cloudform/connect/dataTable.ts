import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LockVersion {
  DataTable?: Value<string>;
  constructor(properties: LockVersion) {
    Object.assign(this, properties);
  }
}
export interface DataTableProperties {
  Status?: Value<string>;
  ValueLockLevel?: Value<string>;
  TimeZone?: Value<string>;
  Description?: Value<string>;
  InstanceArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class DataTable extends ResourceBase<DataTableProperties> {
  static LockVersion = LockVersion;
  constructor(properties?: DataTableProperties) {
    super('AWS::Connect::DataTable', properties || {});
  }
}
