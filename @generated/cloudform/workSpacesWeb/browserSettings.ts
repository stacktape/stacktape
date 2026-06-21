import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class WebContentFilteringPolicy {
  BlockedUrls?: List<Value<string>>;
  AllowedUrls?: List<Value<string>>;
  BlockedCategories?: List<Value<string>>;
  constructor(properties: WebContentFilteringPolicy) {
    Object.assign(this, properties);
  }
}
export interface BrowserSettingsProperties {
  BrowserPolicy?: Value<string>;
  CustomerManagedKey?: Value<string>;
  AdditionalEncryptionContext?: { [key: string]: Value<string> };
  WebContentFilteringPolicy?: WebContentFilteringPolicy;
  Tags?: List<ResourceTag>;
}
export default class BrowserSettings extends ResourceBase<BrowserSettingsProperties> {
  static WebContentFilteringPolicy = WebContentFilteringPolicy;
  constructor(properties?: BrowserSettingsProperties) {
    super('AWS::WorkSpacesWeb::BrowserSettings', properties || {});
  }
}
