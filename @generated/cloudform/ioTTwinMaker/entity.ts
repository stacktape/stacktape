import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Component {
  Status?: Status;
  Description?: Value<string>;
  DefinedIn?: Value<string>;
  PropertyGroups?: { [key: string]: PropertyGroup };
  ComponentTypeId?: Value<string>;
  ComponentName?: Value<string>;
  Properties?: { [key: string]: Property };
  constructor(properties: Component) {
    Object.assign(this, properties);
  }
}

export class CompositeComponent {
  Status?: Status;
  ComponentPath?: Value<string>;
  Description?: Value<string>;
  PropertyGroups?: { [key: string]: PropertyGroup };
  ComponentTypeId?: Value<string>;
  ComponentName?: Value<string>;
  Properties?: { [key: string]: Property };
  constructor(properties: CompositeComponent) {
    Object.assign(this, properties);
  }
}

export class DataType {
  Type?: Value<string>;
  AllowedValues?: List<DataValue>;
  UnitOfMeasure?: Value<string>;
  Relationship?: Relationship;
  NestedType?: DataType;
  constructor(properties: DataType) {
    Object.assign(this, properties);
  }
}

export class DataValue {
  DoubleValue?: Value<number>;
  Expression?: Value<string>;
  BooleanValue?: Value<boolean>;
  IntegerValue?: Value<number>;
  ListValue?: List<DataValue>;
  LongValue?: Value<number>;
  MapValue?: { [key: string]: DataValue };
  RelationshipValue?: RelationshipValue;
  StringValue?: Value<string>;
  constructor(properties: DataValue) {
    Object.assign(this, properties);
  }
}

export class Definition {
  DefaultValue?: DataValue;
  IsImported?: Value<boolean>;
  IsInherited?: Value<boolean>;
  Configuration?: { [key: string]: Value<string> };
  IsExternalId?: Value<boolean>;
  IsStoredExternally?: Value<boolean>;
  IsTimeSeries?: Value<boolean>;
  IsRequiredInEntity?: Value<boolean>;
  DataType?: DataType;
  IsFinal?: Value<boolean>;
  constructor(properties: Definition) {
    Object.assign(this, properties);
  }
}

export class Error {
  Message?: Value<string>;
  Code?: Value<string>;
  constructor(properties: Error) {
    Object.assign(this, properties);
  }
}

export class Property {
  Definition?: Definition;
  Value?: DataValue;
  constructor(properties: Property) {
    Object.assign(this, properties);
  }
}

export class PropertyGroup {
  GroupType?: Value<string>;
  PropertyNames?: List<Value<string>>;
  constructor(properties: PropertyGroup) {
    Object.assign(this, properties);
  }
}

export class Relationship {
  RelationshipType?: Value<string>;
  TargetComponentTypeId?: Value<string>;
  constructor(properties: Relationship) {
    Object.assign(this, properties);
  }
}

export class RelationshipValue {
  TargetComponentName?: Value<string>;
  TargetEntityId?: Value<string>;
  constructor(properties: RelationshipValue) {
    Object.assign(this, properties);
  }
}

export class Status {
  State?: Value<string>;
  Error?: Error;
  constructor(properties: Status) {
    Object.assign(this, properties);
  }
}
export interface EntityProperties {
  EntityId?: Value<string>;
  Components?: { [key: string]: Component };
  ParentEntityId?: Value<string>;
  CompositeComponents?: { [key: string]: CompositeComponent };
  Description?: Value<string>;
  EntityName: Value<string>;
  WorkspaceId: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class Entity extends ResourceBase<EntityProperties> {
  static Component = Component;
  static CompositeComponent = CompositeComponent;
  static DataType = DataType;
  static DataValue = DataValue;
  static Definition = Definition;
  static Error = Error;
  static Property = Property;
  static PropertyGroup = PropertyGroup;
  static Relationship = Relationship;
  static RelationshipValue = RelationshipValue;
  static Status = Status;
  constructor(properties: EntityProperties) {
    super('AWS::IoTTwinMaker::Entity', properties);
  }
}
