import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccessPointPolicyProperties {
  PolicyDocument: { [key: string]: any };
  ObjectLambdaAccessPoint: Value<string>;
}
export default class AccessPointPolicy extends ResourceBase<AccessPointPolicyProperties> {
  constructor(properties: AccessPointPolicyProperties) {
    super('AWS::S3ObjectLambda::AccessPointPolicy', properties);
  }
}
