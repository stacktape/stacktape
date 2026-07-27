import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PermissionProperties {
  FunctionName: Value<string>;
  Action: Value<string>;
  InvokedViaFunctionUrl?: Value<boolean>;
  EventSourceToken?: Value<string>;
  FunctionUrlAuthType?: Value<string>;
  SourceArn?: Value<string>;
  SourceAccount?: Value<string>;
  PrincipalOrgID?: Value<string>;
  Principal: Value<string>;
}
export default class Permission extends ResourceBase<PermissionProperties> {
  constructor(properties: PermissionProperties) {
    super('AWS::Lambda::Permission', properties);
  }
}
