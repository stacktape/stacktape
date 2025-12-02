import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface DeploymentProperties {
  Description?: Value<string>;
  StageName?: Value<string>;
  ApiId: Value<string>;
}
export default class Deployment extends ResourceBase<DeploymentProperties> {
  constructor(properties: DeploymentProperties) {
    super('AWS::ApiGatewayV2::Deployment', properties);
  }
}
