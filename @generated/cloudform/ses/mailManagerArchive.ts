import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ArchiveRetention {
  RetentionPeriod!: Value<string>;
  constructor(properties: ArchiveRetention) {
    Object.assign(this, properties);
  }
}
export interface MailManagerArchiveProperties {
  KmsKeyArn?: Value<string>;
  ArchiveName?: Value<string>;
  Retention?: ArchiveRetention;
  Tags?: List<ResourceTag>;
}
export default class MailManagerArchive extends ResourceBase<MailManagerArchiveProperties> {
  static ArchiveRetention = ArchiveRetention;
  constructor(properties?: MailManagerArchiveProperties) {
    super('AWS::SES::MailManagerArchive', properties || {});
  }
}
