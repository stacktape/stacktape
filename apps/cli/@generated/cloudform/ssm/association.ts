import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class InstanceAssociationOutputLocation {
  S3Location?: S3OutputLocation;
  constructor(properties: InstanceAssociationOutputLocation) {
    Object.assign(this, properties);
  }
}

export class S3OutputLocation {
  OutputS3KeyPrefix?: Value<string>;
  OutputS3Region?: Value<string>;
  OutputS3BucketName?: Value<string>;
  constructor(properties: S3OutputLocation) {
    Object.assign(this, properties);
  }
}

export class Target {
  Values!: List<Value<string>>;
  Key!: Value<string>;
  constructor(properties: Target) {
    Object.assign(this, properties);
  }
}
export interface AssociationProperties {
  AssociationName?: Value<string>;
  CalendarNames?: List<Value<string>>;
  ScheduleExpression?: Value<string>;
  MaxErrors?: Value<string>;
  Parameters?: { [key: string]: any };
  InstanceId?: Value<string>;
  WaitForSuccessTimeoutSeconds?: Value<number>;
  MaxConcurrency?: Value<string>;
  ComplianceSeverity?: Value<string>;
  Targets?: List<Target>;
  SyncCompliance?: Value<string>;
  OutputLocation?: InstanceAssociationOutputLocation;
  ScheduleOffset?: Value<number>;
  Name: Value<string>;
  ApplyOnlyAtCronInterval?: Value<boolean>;
  DocumentVersion?: Value<string>;
  AutomationTargetParameterName?: Value<string>;
}
export default class Association extends ResourceBase<AssociationProperties> {
  static InstanceAssociationOutputLocation = InstanceAssociationOutputLocation;
  static S3OutputLocation = S3OutputLocation;
  static Target = Target;
  constructor(properties: AssociationProperties) {
    super('AWS::SSM::Association', properties);
  }
}
