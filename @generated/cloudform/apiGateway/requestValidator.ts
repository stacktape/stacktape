import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface RequestValidatorProperties {
  ValidateRequestParameters?: Value<boolean>;
  RestApiId: Value<string>;
  ValidateRequestBody?: Value<boolean>;
  Name?: Value<string>;
}
export default class RequestValidator extends ResourceBase<RequestValidatorProperties> {
  constructor(properties: RequestValidatorProperties) {
    super('AWS::ApiGateway::RequestValidator', properties);
  }
}
