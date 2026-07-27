import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataQualityTargetTable {
  TableName?: Value<string>;
  DatabaseName?: Value<string>;
  constructor(properties: DataQualityTargetTable) {
    Object.assign(this, properties);
  }
}
export interface DataQualityRulesetProperties {
  Ruleset?: Value<string>;
  Description?: Value<string>;
  TargetTable?: DataQualityTargetTable;
  ClientToken?: Value<string>;
  Tags?: { [key: string]: any };
  Name?: Value<string>;
}
export default class DataQualityRuleset extends ResourceBase<DataQualityRulesetProperties> {
  static DataQualityTargetTable = DataQualityTargetTable;
  constructor(properties?: DataQualityRulesetProperties) {
    super('AWS::Glue::DataQualityRuleset', properties || {});
  }
}
