import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthFormat {
  SecretArn?: Value<string>;
  Description?: Value<string>;
  IAMAuth?: Value<string>;
  ClientPasswordAuthType?: Value<string>;
  AuthScheme?: Value<string>;
  constructor(properties: AuthFormat) {
    Object.assign(this, properties);
  }
}

export class TagFormat {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: TagFormat) {
    Object.assign(this, properties);
  }
}
export interface DBProxyProperties {
  DBProxyName: Value<string>;
  DebugLogging?: Value<boolean>;
  VpcSubnetIds: List<Value<string>>;
  RoleArn: Value<string>;
  RequireTLS?: Value<boolean>;
  IdleClientTimeout?: Value<number>;
  TargetConnectionNetworkType?: Value<string>;
  DefaultAuthScheme?: Value<string>;
  VpcSecurityGroupIds?: List<Value<string>>;
  Auth?: List<AuthFormat>;
  EngineFamily: Value<string>;
  Tags?: List<TagFormat>;
  EndpointNetworkType?: Value<string>;
}
export default class DBProxy extends ResourceBase<DBProxyProperties> {
  static AuthFormat = AuthFormat;
  static TagFormat = TagFormat;
  constructor(properties: DBProxyProperties) {
    super('AWS::RDS::DBProxy', properties);
  }
}
