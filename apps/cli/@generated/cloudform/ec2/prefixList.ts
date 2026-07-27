import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Entry {
  Description?: Value<string>;
  Cidr!: Value<string>;
  constructor(properties: Entry) {
    Object.assign(this, properties);
  }
}
export interface PrefixListProperties {
  MaxEntries?: Value<number>;
  PrefixListName: Value<string>;
  Entries?: List<Entry>;
  AddressFamily: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class PrefixList extends ResourceBase<PrefixListProperties> {
  static Entry = Entry;
  constructor(properties: PrefixListProperties) {
    super('AWS::EC2::PrefixList', properties);
  }
}
