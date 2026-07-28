import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityUnitsConfiguration {
  QueryCapacityUnits!: Value<number>;
  StorageCapacityUnits!: Value<number>;
  constructor(properties: CapacityUnitsConfiguration) {
    Object.assign(this, properties);
  }
}

export class DocumentMetadataConfiguration {
  Relevance?: Relevance;
  Type!: Value<string>;
  Search?: Search;
  Name!: Value<string>;
  constructor(properties: DocumentMetadataConfiguration) {
    Object.assign(this, properties);
  }
}

export class JsonTokenTypeConfiguration {
  GroupAttributeField!: Value<string>;
  UserNameAttributeField!: Value<string>;
  constructor(properties: JsonTokenTypeConfiguration) {
    Object.assign(this, properties);
  }
}

export class JwtTokenTypeConfiguration {
  ClaimRegex?: Value<string>;
  Issuer?: Value<string>;
  KeyLocation!: Value<string>;
  SecretManagerArn?: Value<string>;
  GroupAttributeField?: Value<string>;
  URL?: Value<string>;
  UserNameAttributeField?: Value<string>;
  constructor(properties: JwtTokenTypeConfiguration) {
    Object.assign(this, properties);
  }
}

export class Relevance {
  Importance?: Value<number>;
  RankOrder?: Value<string>;
  ValueImportanceItems?: List<ValueImportanceItem>;
  Freshness?: Value<boolean>;
  Duration?: Value<string>;
  constructor(properties: Relevance) {
    Object.assign(this, properties);
  }
}

export class Search {
  Displayable?: Value<boolean>;
  Sortable?: Value<boolean>;
  Facetable?: Value<boolean>;
  Searchable?: Value<boolean>;
  constructor(properties: Search) {
    Object.assign(this, properties);
  }
}

export class ServerSideEncryptionConfiguration {
  KmsKeyId?: Value<string>;
  constructor(properties: ServerSideEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class UserTokenConfiguration {
  JwtTokenTypeConfiguration?: JwtTokenTypeConfiguration;
  JsonTokenTypeConfiguration?: JsonTokenTypeConfiguration;
  constructor(properties: UserTokenConfiguration) {
    Object.assign(this, properties);
  }
}

export class ValueImportanceItem {
  Value?: Value<number>;
  Key?: Value<string>;
  constructor(properties: ValueImportanceItem) {
    Object.assign(this, properties);
  }
}
export interface IndexProperties {
  Description?: Value<string>;
  UserContextPolicy?: Value<string>;
  CapacityUnits?: CapacityUnitsConfiguration;
  ServerSideEncryptionConfiguration?: ServerSideEncryptionConfiguration;
  DocumentMetadataConfigurations?: List<DocumentMetadataConfiguration>;
  Tags?: List<ResourceTag>;
  RoleArn: Value<string>;
  Edition: Value<string>;
  Name: Value<string>;
  UserTokenConfigurations?: List<UserTokenConfiguration>;
}
export default class Index extends ResourceBase<IndexProperties> {
  static CapacityUnitsConfiguration = CapacityUnitsConfiguration;
  static DocumentMetadataConfiguration = DocumentMetadataConfiguration;
  static JsonTokenTypeConfiguration = JsonTokenTypeConfiguration;
  static JwtTokenTypeConfiguration = JwtTokenTypeConfiguration;
  static Relevance = Relevance;
  static Search = Search;
  static ServerSideEncryptionConfiguration = ServerSideEncryptionConfiguration;
  static UserTokenConfiguration = UserTokenConfiguration;
  static ValueImportanceItem = ValueImportanceItem;
  constructor(properties: IndexProperties) {
    super('AWS::Kendra::Index', properties);
  }
}
