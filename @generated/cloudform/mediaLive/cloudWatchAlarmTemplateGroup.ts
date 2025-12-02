import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface CloudWatchAlarmTemplateGroupProperties {
  Description?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class CloudWatchAlarmTemplateGroup extends ResourceBase<CloudWatchAlarmTemplateGroupProperties> {
  constructor(properties: CloudWatchAlarmTemplateGroupProperties) {
    super('AWS::MediaLive::CloudWatchAlarmTemplateGroup', properties);
  }
}
