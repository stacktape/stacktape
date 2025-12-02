import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BufferOptions {
  PersistentBufferEnabled!: Value<boolean>;
  constructor(properties: BufferOptions) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLogDestination {
  LogGroup!: Value<string>;
  constructor(properties: CloudWatchLogDestination) {
    Object.assign(this, properties);
  }
}

export class EncryptionAtRestOptions {
  KmsKeyArn!: Value<string>;
  constructor(properties: EncryptionAtRestOptions) {
    Object.assign(this, properties);
  }
}

export class LogPublishingOptions {
  CloudWatchLogDestination?: CloudWatchLogDestination;
  IsLoggingEnabled?: Value<boolean>;
  constructor(properties: LogPublishingOptions) {
    Object.assign(this, properties);
  }
}

export class ResourcePolicy {
  Policy!: { [key: string]: any };
  constructor(properties: ResourcePolicy) {
    Object.assign(this, properties);
  }
}

export class VpcAttachmentOptions {
  AttachToVpc!: Value<boolean>;
  CidrBlock!: Value<string>;
  constructor(properties: VpcAttachmentOptions) {
    Object.assign(this, properties);
  }
}

export class VpcEndpoint {
  VpcId?: Value<string>;
  VpcOptions?: VpcOptions;
  VpcEndpointId?: Value<string>;
  constructor(properties: VpcEndpoint) {
    Object.assign(this, properties);
  }
}

export class VpcOptions {
  VpcAttachmentOptions?: VpcAttachmentOptions;
  VpcEndpointManagement?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds!: List<Value<string>>;
  constructor(properties: VpcOptions) {
    Object.assign(this, properties);
  }
}
export interface PipelineProperties {
  PipelineConfigurationBody: Value<string>;
  BufferOptions?: BufferOptions;
  PipelineRoleArn?: Value<string>;
  MinUnits: Value<number>;
  PipelineName: Value<string>;
  VpcOptions?: VpcOptions;
  MaxUnits: Value<number>;
  LogPublishingOptions?: LogPublishingOptions;
  ResourcePolicy?: ResourcePolicy;
  EncryptionAtRestOptions?: EncryptionAtRestOptions;
  Tags?: List<ResourceTag>;
}
export default class Pipeline extends ResourceBase<PipelineProperties> {
  static BufferOptions = BufferOptions;
  static CloudWatchLogDestination = CloudWatchLogDestination;
  static EncryptionAtRestOptions = EncryptionAtRestOptions;
  static LogPublishingOptions = LogPublishingOptions;
  static ResourcePolicy = ResourcePolicy;
  static VpcAttachmentOptions = VpcAttachmentOptions;
  static VpcEndpoint = VpcEndpoint;
  static VpcOptions = VpcOptions;
  constructor(properties: PipelineProperties) {
    super('AWS::OSIS::Pipeline', properties);
  }
}
