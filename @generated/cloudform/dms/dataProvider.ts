import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DocDbSettings {
  SslMode?: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  DatabaseName!: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: DocDbSettings) {
    Object.assign(this, properties);
  }
}

export class IbmDb2LuwSettings {
  SslMode!: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  DatabaseName!: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: IbmDb2LuwSettings) {
    Object.assign(this, properties);
  }
}

export class IbmDb2zOsSettings {
  SslMode!: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  DatabaseName!: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: IbmDb2zOsSettings) {
    Object.assign(this, properties);
  }
}

export class MariaDbSettings {
  SslMode!: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  CertificateArn?: Value<string>;
  constructor(properties: MariaDbSettings) {
    Object.assign(this, properties);
  }
}

export class MicrosoftSqlServerSettings {
  SslMode!: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  DatabaseName!: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: MicrosoftSqlServerSettings) {
    Object.assign(this, properties);
  }
}

export class MongoDbSettings {
  AuthSource?: Value<string>;
  AuthMechanism?: Value<string>;
  SslMode?: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  DatabaseName?: Value<string>;
  AuthType?: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: MongoDbSettings) {
    Object.assign(this, properties);
  }
}

export class MySqlSettings {
  SslMode!: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  CertificateArn?: Value<string>;
  constructor(properties: MySqlSettings) {
    Object.assign(this, properties);
  }
}

export class OracleSettings {
  SecretsManagerOracleAsmAccessRoleArn?: Value<string>;
  SecretsManagerOracleAsmSecretId?: Value<string>;
  SslMode!: Value<string>;
  SecretsManagerSecurityDbEncryptionSecretId?: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  DatabaseName!: Value<string>;
  AsmServer?: Value<string>;
  CertificateArn?: Value<string>;
  SecretsManagerSecurityDbEncryptionAccessRoleArn?: Value<string>;
  constructor(properties: OracleSettings) {
    Object.assign(this, properties);
  }
}

export class PostgreSqlSettings {
  SslMode!: Value<string>;
  ServerName!: Value<string>;
  Port!: Value<number>;
  DatabaseName!: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: PostgreSqlSettings) {
    Object.assign(this, properties);
  }
}

export class RedshiftSettings {
  ServerName!: Value<string>;
  Port!: Value<number>;
  DatabaseName!: Value<string>;
  constructor(properties: RedshiftSettings) {
    Object.assign(this, properties);
  }
}

export class Settings {
  MariaDbSettings?: MariaDbSettings;
  OracleSettings?: OracleSettings;
  MicrosoftSqlServerSettings?: MicrosoftSqlServerSettings;
  RedshiftSettings?: RedshiftSettings;
  IbmDb2zOsSettings?: IbmDb2zOsSettings;
  MySqlSettings?: MySqlSettings;
  IbmDb2LuwSettings?: IbmDb2LuwSettings;
  DocDbSettings?: DocDbSettings;
  PostgreSqlSettings?: PostgreSqlSettings;
  MongoDbSettings?: MongoDbSettings;
  constructor(properties: Settings) {
    Object.assign(this, properties);
  }
}
export interface DataProviderProperties {
  DataProviderName?: Value<string>;
  Description?: Value<string>;
  ExactSettings?: Value<boolean>;
  Engine: Value<string>;
  Settings?: Settings;
  Tags?: List<ResourceTag>;
  DataProviderIdentifier?: Value<string>;
}
export default class DataProvider extends ResourceBase<DataProviderProperties> {
  static DocDbSettings = DocDbSettings;
  static IbmDb2LuwSettings = IbmDb2LuwSettings;
  static IbmDb2zOsSettings = IbmDb2zOsSettings;
  static MariaDbSettings = MariaDbSettings;
  static MicrosoftSqlServerSettings = MicrosoftSqlServerSettings;
  static MongoDbSettings = MongoDbSettings;
  static MySqlSettings = MySqlSettings;
  static OracleSettings = OracleSettings;
  static PostgreSqlSettings = PostgreSqlSettings;
  static RedshiftSettings = RedshiftSettings;
  static Settings = Settings;
  constructor(properties: DataProviderProperties) {
    super('AWS::DMS::DataProvider', properties);
  }
}
