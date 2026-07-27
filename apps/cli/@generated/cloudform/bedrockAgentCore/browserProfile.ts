import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface BrowserProfileProperties {
  Description?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class BrowserProfile extends ResourceBase<BrowserProfileProperties> {
  constructor(properties: BrowserProfileProperties) {
    super('AWS::BedrockAgentCore::BrowserProfile', properties);
  }
}
