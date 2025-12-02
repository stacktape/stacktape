import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class S3Location {
  BucketName!: Value<string>;
  ObjectKey!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}
export interface SimulationProperties {
  SchemaS3Location?: S3Location;
  SnapshotS3Location?: S3Location;
  MaximumDuration?: Value<string>;
  RoleArn: Value<string>;
  Name: Value<string>;
}
export default class Simulation extends ResourceBase<SimulationProperties> {
  static S3Location = S3Location;
  constructor(properties: SimulationProperties) {
    super('AWS::SimSpaceWeaver::Simulation', properties);
  }
}
