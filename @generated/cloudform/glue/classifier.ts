import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CsvClassifier {
  ContainsCustomDatatype?: List<Value<string>>;
  QuoteSymbol?: Value<string>;
  ContainsHeader?: Value<string>;
  Delimiter?: Value<string>;
  Header?: List<Value<string>>;
  AllowSingleColumn?: Value<boolean>;
  CustomDatatypeConfigured?: Value<boolean>;
  DisableValueTrimming?: Value<boolean>;
  Name?: Value<string>;
  constructor(properties: CsvClassifier) {
    Object.assign(this, properties);
  }
}

export class GrokClassifier {
  CustomPatterns?: Value<string>;
  GrokPattern!: Value<string>;
  Classification!: Value<string>;
  Name?: Value<string>;
  constructor(properties: GrokClassifier) {
    Object.assign(this, properties);
  }
}

export class JsonClassifier {
  JsonPath!: Value<string>;
  Name?: Value<string>;
  constructor(properties: JsonClassifier) {
    Object.assign(this, properties);
  }
}

export class XMLClassifier {
  RowTag!: Value<string>;
  Classification!: Value<string>;
  Name?: Value<string>;
  constructor(properties: XMLClassifier) {
    Object.assign(this, properties);
  }
}
export interface ClassifierProperties {
  XMLClassifier?: XMLClassifier;
  JsonClassifier?: JsonClassifier;
  CsvClassifier?: CsvClassifier;
  GrokClassifier?: GrokClassifier;
}
export default class Classifier extends ResourceBase<ClassifierProperties> {
  static CsvClassifier = CsvClassifier;
  static GrokClassifier = GrokClassifier;
  static JsonClassifier = JsonClassifier;
  static XMLClassifier = XMLClassifier;
  constructor(properties?: ClassifierProperties) {
    super('AWS::Glue::Classifier', properties || {});
  }
}
