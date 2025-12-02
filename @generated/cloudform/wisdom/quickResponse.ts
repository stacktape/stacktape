import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class GroupingConfiguration {
  Values!: List<Value<string>>;
  Criteria!: Value<string>;
  constructor(properties: GroupingConfiguration) {
    Object.assign(this, properties);
  }
}

export class QuickResponseContentProvider {
  Content?: Value<string>;
  constructor(properties: QuickResponseContentProvider) {
    Object.assign(this, properties);
  }
}

export class QuickResponseContents {
  PlainText?: QuickResponseContentProvider;
  Markdown?: QuickResponseContentProvider;
  constructor(properties: QuickResponseContents) {
    Object.assign(this, properties);
  }
}
export interface QuickResponseProperties {
  Description?: Value<string>;
  ContentType?: Value<string>;
  Language?: Value<string>;
  IsActive?: Value<boolean>;
  Content: QuickResponseContentProvider;
  GroupingConfiguration?: GroupingConfiguration;
  KnowledgeBaseArn: Value<string>;
  Channels?: List<Value<string>>;
  ShortcutKey?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class QuickResponse extends ResourceBase<QuickResponseProperties> {
  static GroupingConfiguration = GroupingConfiguration;
  static QuickResponseContentProvider = QuickResponseContentProvider;
  static QuickResponseContents = QuickResponseContents;
  constructor(properties: QuickResponseProperties) {
    super('AWS::Wisdom::QuickResponse', properties);
  }
}
