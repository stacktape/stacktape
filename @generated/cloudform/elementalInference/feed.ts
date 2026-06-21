import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ClippingConfig {
  CallbackMetadata?: Value<string>;
  constructor(properties: ClippingConfig) {
    Object.assign(this, properties);
  }
}

export class GetOutput {
  Status!: Value<string>;
  OutputConfig!: OutputConfig;
  Description?: Value<string>;
  Name!: Value<string>;
  constructor(properties: GetOutput) {
    Object.assign(this, properties);
  }
}

export class OutputConfig {
  Clipping?: ClippingConfig;
  Cropping?: { [key: string]: any };
  constructor(properties: OutputConfig) {
    Object.assign(this, properties);
  }
}
export interface FeedProperties {
  Outputs: List<GetOutput>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Feed extends ResourceBase<FeedProperties> {
  static ClippingConfig = ClippingConfig;
  static GetOutput = GetOutput;
  static OutputConfig = OutputConfig;
  constructor(properties: FeedProperties) {
    super('AWS::ElementalInference::Feed', properties);
  }
}
