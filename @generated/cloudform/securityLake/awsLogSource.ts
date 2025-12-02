import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AwsLogSourceProperties {
  SourceName: Value<string>;
  SourceVersion: Value<string>;
  Accounts?: List<Value<string>>;
  DataLakeArn: Value<string>;
}
export default class AwsLogSource extends ResourceBase<AwsLogSourceProperties> {
  constructor(properties: AwsLogSourceProperties) {
    super('AWS::SecurityLake::AwsLogSource', properties);
  }
}
