import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PublisherProperties {
  AcceptTermsAndConditions: Value<boolean>;
  ConnectionArn?: Value<string>;
}
export default class Publisher extends ResourceBase<PublisherProperties> {
  constructor(properties: PublisherProperties) {
    super('AWS::CloudFormation::Publisher', properties);
  }
}
