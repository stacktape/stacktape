import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AddKeyEntry {
  OverwriteIfExists?: Value<boolean>;
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: AddKeyEntry) {
    Object.assign(this, properties);
  }
}

export class AddKeys {
  Entries!: List<AddKeyEntry>;
  constructor(properties: AddKeys) {
    Object.assign(this, properties);
  }
}

export class CopyValue {
  Entries!: List<CopyValueEntry>;
  constructor(properties: CopyValue) {
    Object.assign(this, properties);
  }
}

export class CopyValueEntry {
  Target!: Value<string>;
  OverwriteIfExists?: Value<boolean>;
  Source!: Value<string>;
  constructor(properties: CopyValueEntry) {
    Object.assign(this, properties);
  }
}

export class Csv {
  QuoteCharacter?: Value<string>;
  Delimiter?: Value<string>;
  Columns?: List<Value<string>>;
  Source?: Value<string>;
  constructor(properties: Csv) {
    Object.assign(this, properties);
  }
}

export class DateTimeConverter {
  Locale?: Value<string>;
  Target!: Value<string>;
  MatchPatterns!: List<Value<string>>;
  SourceTimezone?: Value<string>;
  TargetFormat?: Value<string>;
  TargetTimezone?: Value<string>;
  Source!: Value<string>;
  constructor(properties: DateTimeConverter) {
    Object.assign(this, properties);
  }
}

export class DeleteKeys {
  WithKeys!: List<Value<string>>;
  constructor(properties: DeleteKeys) {
    Object.assign(this, properties);
  }
}

export class Grok {
  Source?: Value<string>;
  Match!: Value<string>;
  constructor(properties: Grok) {
    Object.assign(this, properties);
  }
}

export class ListToMap {
  ValueKey?: Value<string>;
  Target?: Value<string>;
  Flatten?: Value<boolean>;
  FlattenedElement?: Value<string>;
  Source!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ListToMap) {
    Object.assign(this, properties);
  }
}

export class LowerCaseString {
  WithKeys!: List<Value<string>>;
  constructor(properties: LowerCaseString) {
    Object.assign(this, properties);
  }
}

export class MoveKeyEntry {
  Target!: Value<string>;
  OverwriteIfExists?: Value<boolean>;
  Source!: Value<string>;
  constructor(properties: MoveKeyEntry) {
    Object.assign(this, properties);
  }
}

export class MoveKeys {
  Entries!: List<MoveKeyEntry>;
  constructor(properties: MoveKeys) {
    Object.assign(this, properties);
  }
}

export class ParseCloudfront {
  Source?: Value<string>;
  constructor(properties: ParseCloudfront) {
    Object.assign(this, properties);
  }
}

export class ParseJSON {
  Destination?: Value<string>;
  Source?: Value<string>;
  constructor(properties: ParseJSON) {
    Object.assign(this, properties);
  }
}

export class ParseKeyValue {
  Destination?: Value<string>;
  KeyValueDelimiter?: Value<string>;
  OverwriteIfExists?: Value<boolean>;
  FieldDelimiter?: Value<string>;
  NonMatchValue?: Value<string>;
  Source?: Value<string>;
  KeyPrefix?: Value<string>;
  constructor(properties: ParseKeyValue) {
    Object.assign(this, properties);
  }
}

export class ParsePostgres {
  Source?: Value<string>;
  constructor(properties: ParsePostgres) {
    Object.assign(this, properties);
  }
}

export class ParseRoute53 {
  Source?: Value<string>;
  constructor(properties: ParseRoute53) {
    Object.assign(this, properties);
  }
}

export class ParseToOCSF {
  EventSource!: Value<string>;
  OcsfVersion!: Value<string>;
  Source?: Value<string>;
  constructor(properties: ParseToOCSF) {
    Object.assign(this, properties);
  }
}

export class ParseVPC {
  Source?: Value<string>;
  constructor(properties: ParseVPC) {
    Object.assign(this, properties);
  }
}

export class ParseWAF {
  Source?: Value<string>;
  constructor(properties: ParseWAF) {
    Object.assign(this, properties);
  }
}

export class Processor {
  ParseCloudfront?: ParseCloudfront;
  LowerCaseString?: LowerCaseString;
  UpperCaseString?: UpperCaseString;
  DeleteKeys?: DeleteKeys;
  RenameKeys?: RenameKeys;
  Grok?: Grok;
  SplitString?: SplitString;
  Csv?: Csv;
  AddKeys?: AddKeys;
  ParseToOCSF?: ParseToOCSF;
  SubstituteString?: SubstituteString;
  ParseKeyValue?: ParseKeyValue;
  ParseWAF?: ParseWAF;
  ParseVPC?: ParseVPC;
  ParseRoute53?: ParseRoute53;
  TypeConverter?: TypeConverter;
  ParseJSON?: ParseJSON;
  ParsePostgres?: ParsePostgres;
  CopyValue?: CopyValue;
  MoveKeys?: MoveKeys;
  DateTimeConverter?: DateTimeConverter;
  TrimString?: TrimString;
  ListToMap?: ListToMap;
  constructor(properties: Processor) {
    Object.assign(this, properties);
  }
}

export class RenameKeyEntry {
  OverwriteIfExists?: Value<boolean>;
  RenameTo!: Value<string>;
  Key!: Value<string>;
  constructor(properties: RenameKeyEntry) {
    Object.assign(this, properties);
  }
}

export class RenameKeys {
  Entries!: List<RenameKeyEntry>;
  constructor(properties: RenameKeys) {
    Object.assign(this, properties);
  }
}

export class SplitString {
  Entries!: List<SplitStringEntry>;
  constructor(properties: SplitString) {
    Object.assign(this, properties);
  }
}

export class SplitStringEntry {
  Delimiter!: Value<string>;
  Source!: Value<string>;
  constructor(properties: SplitStringEntry) {
    Object.assign(this, properties);
  }
}

export class SubstituteString {
  Entries!: List<SubstituteStringEntry>;
  constructor(properties: SubstituteString) {
    Object.assign(this, properties);
  }
}

export class SubstituteStringEntry {
  From!: Value<string>;
  To!: Value<string>;
  Source!: Value<string>;
  constructor(properties: SubstituteStringEntry) {
    Object.assign(this, properties);
  }
}

export class TrimString {
  WithKeys!: List<Value<string>>;
  constructor(properties: TrimString) {
    Object.assign(this, properties);
  }
}

export class TypeConverter {
  Entries!: List<TypeConverterEntry>;
  constructor(properties: TypeConverter) {
    Object.assign(this, properties);
  }
}

export class TypeConverterEntry {
  Type!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TypeConverterEntry) {
    Object.assign(this, properties);
  }
}

export class UpperCaseString {
  WithKeys!: List<Value<string>>;
  constructor(properties: UpperCaseString) {
    Object.assign(this, properties);
  }
}
export interface TransformerProperties {
  TransformerConfig: List<Processor>;
  LogGroupIdentifier: Value<string>;
}
export default class Transformer extends ResourceBase<TransformerProperties> {
  static AddKeyEntry = AddKeyEntry;
  static AddKeys = AddKeys;
  static CopyValue = CopyValue;
  static CopyValueEntry = CopyValueEntry;
  static Csv = Csv;
  static DateTimeConverter = DateTimeConverter;
  static DeleteKeys = DeleteKeys;
  static Grok = Grok;
  static ListToMap = ListToMap;
  static LowerCaseString = LowerCaseString;
  static MoveKeyEntry = MoveKeyEntry;
  static MoveKeys = MoveKeys;
  static ParseCloudfront = ParseCloudfront;
  static ParseJSON = ParseJSON;
  static ParseKeyValue = ParseKeyValue;
  static ParsePostgres = ParsePostgres;
  static ParseRoute53 = ParseRoute53;
  static ParseToOCSF = ParseToOCSF;
  static ParseVPC = ParseVPC;
  static ParseWAF = ParseWAF;
  static Processor = Processor;
  static RenameKeyEntry = RenameKeyEntry;
  static RenameKeys = RenameKeys;
  static SplitString = SplitString;
  static SplitStringEntry = SplitStringEntry;
  static SubstituteString = SubstituteString;
  static SubstituteStringEntry = SubstituteStringEntry;
  static TrimString = TrimString;
  static TypeConverter = TypeConverter;
  static TypeConverterEntry = TypeConverterEntry;
  static UpperCaseString = UpperCaseString;
  constructor(properties: TransformerProperties) {
    super('AWS::Logs::Transformer', properties);
  }
}
