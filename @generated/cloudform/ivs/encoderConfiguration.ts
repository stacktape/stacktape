import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Video {
  Framerate?: Value<number>;
  Height?: Value<number>;
  Bitrate?: Value<number>;
  Width?: Value<number>;
  constructor(properties: Video) {
    Object.assign(this, properties);
  }
}
export interface EncoderConfigurationProperties {
  Video?: Video;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class EncoderConfiguration extends ResourceBase<EncoderConfigurationProperties> {
  static Video = Video;
  constructor(properties?: EncoderConfigurationProperties) {
    super('AWS::IVS::EncoderConfiguration', properties || {});
  }
}
