import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Analysis {
  Analyzer?: { [key: string]: AnalyzerItems };
  constructor(properties: Analysis) {
    Object.assign(this, properties);
  }
}

export class AnalyzerItems {
  Type?: Value<string>;
  Filter?: List<Value<string>>;
  CharFilter?: List<Value<string>>;
  Tokenizer?: Value<string>;
  constructor(properties: AnalyzerItems) {
    Object.assign(this, properties);
  }
}

export class IndexInner {
  KnnAlgoParamEfSearch?: Value<number>;
  RefreshInterval?: Value<string>;
  Knn?: Value<boolean>;
  constructor(properties: IndexInner) {
    Object.assign(this, properties);
  }
}

export class IndexSettings {
  Analysis?: Analysis;
  Index?: Index;
  constructor(properties: IndexSettings) {
    Object.assign(this, properties);
  }
}

export class Mappings {
  Properties?: { [key: string]: PropertyMapping };
  constructor(properties: Mappings) {
    Object.assign(this, properties);
  }
}

export class Method {
  Parameters?: Parameters;
  SpaceType?: Value<string>;
  Engine?: Value<string>;
  Name!: Value<string>;
  constructor(properties: Method) {
    Object.assign(this, properties);
  }
}

export class Parameters {
  EfConstruction?: Value<number>;
  M?: Value<number>;
  constructor(properties: Parameters) {
    Object.assign(this, properties);
  }
}

export class PropertyMapping {
  Type!: Value<string>;
  SpaceType?: Value<string>;
  CompressionLevel?: Value<string>;
  Value?: Value<string>;
  DataType?: Value<string>;
  Index?: Value<boolean>;
  Dimension?: Value<number>;
  Method?: Method;
  Properties?: { [key: string]: PropertyMapping };
  Analyzer?: Value<string>;
  constructor(properties: PropertyMapping) {
    Object.assign(this, properties);
  }
}
export interface IndexProperties {
  IndexName: Value<string>;
  Mappings?: Mappings;
  CollectionEndpoint: Value<string>;
  Settings?: IndexSettings;
}
export default class Index extends ResourceBase<IndexProperties> {
  static Analysis = Analysis;
  static AnalyzerItems = AnalyzerItems;
  static Index = IndexInner;
  static IndexSettings = IndexSettings;
  static Mappings = Mappings;
  static Method = Method;
  static Parameters = Parameters;
  static PropertyMapping = PropertyMapping;
  constructor(properties: IndexProperties) {
    super('AWS::OpenSearchServerless::Index', properties);
  }
}
