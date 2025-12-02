import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FindMatchesParameters {
  PrecisionRecallTradeoff?: Value<number>;
  EnforceProvidedLabels?: Value<boolean>;
  PrimaryKeyColumnName!: Value<string>;
  AccuracyCostTradeoff?: Value<number>;
  constructor(properties: FindMatchesParameters) {
    Object.assign(this, properties);
  }
}

export class GlueTables {
  ConnectionName?: Value<string>;
  TableName!: Value<string>;
  DatabaseName!: Value<string>;
  CatalogId?: Value<string>;
  constructor(properties: GlueTables) {
    Object.assign(this, properties);
  }
}

export class InputRecordTables {
  GlueTables?: List<GlueTables>;
  constructor(properties: InputRecordTables) {
    Object.assign(this, properties);
  }
}

export class MLUserDataEncryption {
  MLUserDataEncryptionMode!: Value<string>;
  KmsKeyId?: Value<string>;
  constructor(properties: MLUserDataEncryption) {
    Object.assign(this, properties);
  }
}

export class TransformEncryption {
  MLUserDataEncryption?: MLUserDataEncryption;
  TaskRunSecurityConfigurationName?: Value<string>;
  constructor(properties: TransformEncryption) {
    Object.assign(this, properties);
  }
}

export class TransformParameters {
  TransformType!: Value<string>;
  FindMatchesParameters?: FindMatchesParameters;
  constructor(properties: TransformParameters) {
    Object.assign(this, properties);
  }
}
export interface MLTransformProperties {
  MaxRetries?: Value<number>;
  Description?: Value<string>;
  TransformEncryption?: TransformEncryption;
  Timeout?: Value<number>;
  Name?: Value<string>;
  Role: Value<string>;
  WorkerType?: Value<string>;
  GlueVersion?: Value<string>;
  TransformParameters: TransformParameters;
  InputRecordTables: InputRecordTables;
  NumberOfWorkers?: Value<number>;
  Tags?: { [key: string]: any };
  MaxCapacity?: Value<number>;
}
export default class MLTransform extends ResourceBase<MLTransformProperties> {
  static FindMatchesParameters = FindMatchesParameters;
  static GlueTables = GlueTables;
  static InputRecordTables = InputRecordTables;
  static MLUserDataEncryption = MLUserDataEncryption;
  static TransformEncryption = TransformEncryption;
  static TransformParameters = TransformParameters;
  constructor(properties: MLTransformProperties) {
    super('AWS::Glue::MLTransform', properties);
  }
}
