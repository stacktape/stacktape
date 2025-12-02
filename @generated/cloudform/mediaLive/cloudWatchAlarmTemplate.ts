import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface CloudWatchAlarmTemplateProperties {
  TargetResourceType: Value<string>;
  ComparisonOperator: Value<string>;
  TreatMissingData: Value<string>;
  Description?: Value<string>;
  Period: Value<number>;
  EvaluationPeriods: Value<number>;
  GroupIdentifier?: Value<string>;
  Name: Value<string>;
  MetricName: Value<string>;
  Statistic: Value<string>;
  DatapointsToAlarm?: Value<number>;
  Tags?: { [key: string]: Value<string> };
  Threshold: Value<number>;
}
export default class CloudWatchAlarmTemplate extends ResourceBase<CloudWatchAlarmTemplateProperties> {
  constructor(properties: CloudWatchAlarmTemplateProperties) {
    super('AWS::MediaLive::CloudWatchAlarmTemplate', properties);
  }
}
