import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface FileSystemPolicyProperties {
  Policy: { [key: string]: any };
  FileSystemId: Value<string>;
}
export default class FileSystemPolicy extends ResourceBase<FileSystemPolicyProperties> {
  constructor(properties: FileSystemPolicyProperties) {
    super('AWS::S3Files::FileSystemPolicy', properties);
  }
}
