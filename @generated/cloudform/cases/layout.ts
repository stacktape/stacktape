import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BasicLayout {
  TopPanel?: LayoutSections;
  MoreInfo?: LayoutSections;
  constructor(properties: BasicLayout) {
    Object.assign(this, properties);
  }
}

export class FieldGroup {
  Fields!: List<FieldItem>;
  Name?: Value<string>;
  constructor(properties: FieldGroup) {
    Object.assign(this, properties);
  }
}

export class FieldItem {
  Id!: Value<string>;
  constructor(properties: FieldItem) {
    Object.assign(this, properties);
  }
}

export class LayoutContent {
  Basic!: BasicLayout;
  constructor(properties: LayoutContent) {
    Object.assign(this, properties);
  }
}

export class LayoutSections {
  Sections?: List<Section>;
  constructor(properties: LayoutSections) {
    Object.assign(this, properties);
  }
}

export class Section {
  FieldGroup!: FieldGroup;
  constructor(properties: Section) {
    Object.assign(this, properties);
  }
}
export interface LayoutProperties {
  DomainId?: Value<string>;
  Content: LayoutContent;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Layout extends ResourceBase<LayoutProperties> {
  static BasicLayout = BasicLayout;
  static FieldGroup = FieldGroup;
  static FieldItem = FieldItem;
  static LayoutContent = LayoutContent;
  static LayoutSections = LayoutSections;
  static Section = Section;
  constructor(properties: LayoutProperties) {
    super('AWS::Cases::Layout', properties);
  }
}
