import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class LevelFive {
  HierarchyLevelId?: Value<string>;
  HierarchyLevelArn?: Value<string>;
  Name!: Value<string>;
  constructor(properties: LevelFive) {
    Object.assign(this, properties);
  }
}

export class LevelFour {
  HierarchyLevelId?: Value<string>;
  HierarchyLevelArn?: Value<string>;
  Name!: Value<string>;
  constructor(properties: LevelFour) {
    Object.assign(this, properties);
  }
}

export class LevelOne {
  HierarchyLevelId?: Value<string>;
  HierarchyLevelArn?: Value<string>;
  Name!: Value<string>;
  constructor(properties: LevelOne) {
    Object.assign(this, properties);
  }
}

export class LevelThree {
  HierarchyLevelId?: Value<string>;
  HierarchyLevelArn?: Value<string>;
  Name!: Value<string>;
  constructor(properties: LevelThree) {
    Object.assign(this, properties);
  }
}

export class LevelTwo {
  HierarchyLevelId?: Value<string>;
  HierarchyLevelArn?: Value<string>;
  Name!: Value<string>;
  constructor(properties: LevelTwo) {
    Object.assign(this, properties);
  }
}

export class UserHierarchyStructureInner {
  LevelThree?: LevelThree;
  LevelTwo?: LevelTwo;
  LevelFive?: LevelFive;
  LevelFour?: LevelFour;
  LevelOne?: LevelOne;
  constructor(properties: UserHierarchyStructureInner) {
    Object.assign(this, properties);
  }
}
export interface UserHierarchyStructureProperties {
  UserHierarchyStructure?: UserHierarchyStructure;
  InstanceArn: Value<string>;
}
export default class UserHierarchyStructure extends ResourceBase<UserHierarchyStructureProperties> {
  static LevelFive = LevelFive;
  static LevelFour = LevelFour;
  static LevelOne = LevelOne;
  static LevelThree = LevelThree;
  static LevelTwo = LevelTwo;
  static UserHierarchyStructure = UserHierarchyStructureInner;
  constructor(properties: UserHierarchyStructureProperties) {
    super('AWS::Connect::UserHierarchyStructure', properties);
  }
}
