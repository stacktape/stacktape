import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class MultiplexProgramPacketIdentifiersMap {
  EtvPlatformPid?: Value<number>;
  DvbTeletextPid?: Value<number>;
  KlvDataPids?: List<Value<number>>;
  PcrPid?: Value<number>;
  VideoPid?: Value<number>;
  PmtPid?: Value<number>;
  Scte27Pids?: List<Value<number>>;
  DvbSubPids?: List<Value<number>>;
  Scte35Pid?: Value<number>;
  EtvSignalPid?: Value<number>;
  PrivateMetadataPid?: Value<number>;
  TimedMetadataPid?: Value<number>;
  AudioPids?: List<Value<number>>;
  constructor(properties: MultiplexProgramPacketIdentifiersMap) {
    Object.assign(this, properties);
  }
}

export class MultiplexProgramPipelineDetail {
  ActiveChannelPipeline?: Value<string>;
  PipelineId?: Value<string>;
  constructor(properties: MultiplexProgramPipelineDetail) {
    Object.assign(this, properties);
  }
}

export class MultiplexProgramServiceDescriptor {
  ProviderName!: Value<string>;
  ServiceName!: Value<string>;
  constructor(properties: MultiplexProgramServiceDescriptor) {
    Object.assign(this, properties);
  }
}

export class MultiplexProgramSettings {
  PreferredChannelPipeline?: Value<string>;
  ServiceDescriptor?: MultiplexProgramServiceDescriptor;
  VideoSettings?: MultiplexVideoSettings;
  ProgramNumber!: Value<number>;
  constructor(properties: MultiplexProgramSettings) {
    Object.assign(this, properties);
  }
}

export class MultiplexStatmuxVideoSettings {
  Priority?: Value<number>;
  MaximumBitrate?: Value<number>;
  MinimumBitrate?: Value<number>;
  constructor(properties: MultiplexStatmuxVideoSettings) {
    Object.assign(this, properties);
  }
}

export class MultiplexVideoSettings {
  StatmuxSettings?: MultiplexStatmuxVideoSettings;
  ConstantBitrate?: Value<number>;
  constructor(properties: MultiplexVideoSettings) {
    Object.assign(this, properties);
  }
}
export interface MultiplexprogramProperties {
  MultiplexId?: Value<string>;
  PreferredChannelPipeline?: Value<string>;
  PacketIdentifiersMap?: MultiplexProgramPacketIdentifiersMap;
  PipelineDetails?: List<MultiplexProgramPipelineDetail>;
  MultiplexProgramSettings?: MultiplexProgramSettings;
  ProgramName?: Value<string>;
}
export default class Multiplexprogram extends ResourceBase<MultiplexprogramProperties> {
  static MultiplexProgramPacketIdentifiersMap = MultiplexProgramPacketIdentifiersMap;
  static MultiplexProgramPipelineDetail = MultiplexProgramPipelineDetail;
  static MultiplexProgramServiceDescriptor = MultiplexProgramServiceDescriptor;
  static MultiplexProgramSettings = MultiplexProgramSettings;
  static MultiplexStatmuxVideoSettings = MultiplexStatmuxVideoSettings;
  static MultiplexVideoSettings = MultiplexVideoSettings;
  constructor(properties?: MultiplexprogramProperties) {
    super('AWS::MediaLive::Multiplexprogram', properties || {});
  }
}
