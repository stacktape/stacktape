import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface PresetProperties {
  Category?: Value<string>;
  Description?: Value<string>;
  SettingsJson: { [key: string]: any };
  Tags?: { [key: string]: any };
  Name?: Value<string>;
}
export default class Preset extends ResourceBase<PresetProperties> {
  constructor(properties: PresetProperties) {
    super('AWS::MediaConvert::Preset', properties);
  }
}
