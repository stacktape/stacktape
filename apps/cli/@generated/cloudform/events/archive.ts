import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ArchiveProperties {
  EventPattern?: { [key: string]: any };
  KmsKeyIdentifier?: Value<string>;
  Description?: Value<string>;
  SourceArn: Value<string>;
  ArchiveName?: Value<string>;
  RetentionDays?: Value<number>;
}
export default class Archive extends ResourceBase<ArchiveProperties> {
  constructor(properties: ArchiveProperties) {
    super('AWS::Events::Archive', properties);
  }
}
