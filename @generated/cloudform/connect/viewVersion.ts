import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ViewVersionProperties {
  ViewArn: Value<string>;
  VersionDescription?: Value<string>;
  ViewContentSha256?: Value<string>;
}
export default class ViewVersion extends ResourceBase<ViewVersionProperties> {
  constructor(properties: ViewVersionProperties) {
    super('AWS::Connect::ViewVersion', properties);
  }
}
