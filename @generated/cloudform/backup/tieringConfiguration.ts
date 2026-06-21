import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourceSelection {
  TieringDownSettingsInDays!: Value<number>;
  ResourceType!: Value<string>;
  Resources!: List<Value<string>>;
  constructor(properties: ResourceSelection) {
    Object.assign(this, properties);
  }
}
export interface TieringConfigurationProperties {
  TieringConfigurationName: Value<string>;
  BackupVaultName: Value<string>;
  TieringConfigurationTags?: { [key: string]: Value<string> };
  ResourceSelection: List<ResourceSelection>;
}
export default class TieringConfiguration extends ResourceBase<TieringConfigurationProperties> {
  static ResourceSelection = ResourceSelection;
  constructor(properties: TieringConfigurationProperties) {
    super('AWS::Backup::TieringConfiguration', properties);
  }
}
