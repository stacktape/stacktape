import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface LogAnomalyDetectionIntegrationProperties {}
export default class LogAnomalyDetectionIntegration extends ResourceBase<LogAnomalyDetectionIntegrationProperties> {
  constructor(properties?: LogAnomalyDetectionIntegrationProperties) {
    super('AWS::DevOpsGuru::LogAnomalyDetectionIntegration', properties || {});
  }
}
