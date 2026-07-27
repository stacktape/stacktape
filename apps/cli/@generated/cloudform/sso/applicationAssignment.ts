import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ApplicationAssignmentProperties {
  ApplicationArn: Value<string>;
  PrincipalId: Value<string>;
  PrincipalType: Value<string>;
}
export default class ApplicationAssignment extends ResourceBase<ApplicationAssignmentProperties> {
  constructor(properties: ApplicationAssignmentProperties) {
    super('AWS::SSO::ApplicationAssignment', properties);
  }
}
