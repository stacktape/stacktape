import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TermsProperties {
  Enforcement: Value<string>;
  UserPoolId: Value<string>;
  ClientId?: Value<string>;
  TermsName: Value<string>;
  Links: { [key: string]: Value<string> };
  TermsSource: Value<string>;
}
export default class Terms extends ResourceBase<TermsProperties> {
  constructor(properties: TermsProperties) {
    super('AWS::Cognito::Terms', properties);
  }
}
