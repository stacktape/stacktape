import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface CustomResourceProperties {
  ServiceTimeout?: Value<number>;
  ServiceToken: Value<string>;
}
export default class CustomResource extends ResourceBase<CustomResourceProperties> {
  constructor(properties: CustomResourceProperties) {
    super('AWS::CloudFormation::CustomResource', properties);
  }
}
