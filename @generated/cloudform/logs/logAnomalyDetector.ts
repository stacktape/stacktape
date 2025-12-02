import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface LogAnomalyDetectorProperties {
  AnomalyVisibilityTime?: Value<number>;
  FilterPattern?: Value<string>;
  AccountId?: Value<string>;
  KmsKeyId?: Value<string>;
  LogGroupArnList?: List<Value<string>>;
  EvaluationFrequency?: Value<string>;
  DetectorName?: Value<string>;
}
export default class LogAnomalyDetector extends ResourceBase<LogAnomalyDetectorProperties> {
  constructor(properties?: LogAnomalyDetectorProperties) {
    super('AWS::Logs::LogAnomalyDetector', properties || {});
  }
}
