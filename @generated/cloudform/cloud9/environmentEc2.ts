import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Repository {
  PathComponent!: Value<string>;
  RepositoryUrl!: Value<string>;
  constructor(properties: Repository) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentEC2Properties {
  Repositories?: List<Repository>;
  OwnerArn?: Value<string>;
  Description?: Value<string>;
  ConnectionType?: Value<string>;
  AutomaticStopTimeMinutes?: Value<number>;
  ImageId: Value<string>;
  SubnetId?: Value<string>;
  InstanceType: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class EnvironmentEC2 extends ResourceBase<EnvironmentEC2Properties> {
  static Repository = Repository;
  constructor(properties: EnvironmentEC2Properties) {
    super('AWS::Cloud9::EnvironmentEC2', properties);
  }
}
