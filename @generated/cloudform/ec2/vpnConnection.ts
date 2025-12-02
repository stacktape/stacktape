import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudwatchLogOptionsSpecification {
  LogEnabled?: Value<boolean>;
  LogOutputFormat?: Value<string>;
  LogGroupArn?: Value<string>;
  constructor(properties: CloudwatchLogOptionsSpecification) {
    Object.assign(this, properties);
  }
}

export class IKEVersionsRequestListValue {
  Value?: Value<string>;
  constructor(properties: IKEVersionsRequestListValue) {
    Object.assign(this, properties);
  }
}

export class Phase1DHGroupNumbersRequestListValue {
  Value?: Value<number>;
  constructor(properties: Phase1DHGroupNumbersRequestListValue) {
    Object.assign(this, properties);
  }
}

export class Phase1EncryptionAlgorithmsRequestListValue {
  Value?: Value<string>;
  constructor(properties: Phase1EncryptionAlgorithmsRequestListValue) {
    Object.assign(this, properties);
  }
}

export class Phase1IntegrityAlgorithmsRequestListValue {
  Value?: Value<string>;
  constructor(properties: Phase1IntegrityAlgorithmsRequestListValue) {
    Object.assign(this, properties);
  }
}

export class Phase2DHGroupNumbersRequestListValue {
  Value?: Value<number>;
  constructor(properties: Phase2DHGroupNumbersRequestListValue) {
    Object.assign(this, properties);
  }
}

export class Phase2EncryptionAlgorithmsRequestListValue {
  Value?: Value<string>;
  constructor(properties: Phase2EncryptionAlgorithmsRequestListValue) {
    Object.assign(this, properties);
  }
}

export class Phase2IntegrityAlgorithmsRequestListValue {
  Value?: Value<string>;
  constructor(properties: Phase2IntegrityAlgorithmsRequestListValue) {
    Object.assign(this, properties);
  }
}

export class VpnTunnelLogOptionsSpecification {
  CloudwatchLogOptions?: CloudwatchLogOptionsSpecification;
  constructor(properties: VpnTunnelLogOptionsSpecification) {
    Object.assign(this, properties);
  }
}

export class VpnTunnelOptionsSpecification {
  Phase2EncryptionAlgorithms?: List<Phase2EncryptionAlgorithmsRequestListValue>;
  Phase2DHGroupNumbers?: List<Phase2DHGroupNumbersRequestListValue>;
  TunnelInsideIpv6Cidr?: Value<string>;
  StartupAction?: Value<string>;
  TunnelInsideCidr?: Value<string>;
  IKEVersions?: List<IKEVersionsRequestListValue>;
  LogOptions?: VpnTunnelLogOptionsSpecification;
  Phase1DHGroupNumbers?: List<Phase1DHGroupNumbersRequestListValue>;
  ReplayWindowSize?: Value<number>;
  EnableTunnelLifecycleControl?: Value<boolean>;
  RekeyMarginTimeSeconds?: Value<number>;
  DPDTimeoutAction?: Value<string>;
  Phase2LifetimeSeconds?: Value<number>;
  Phase2IntegrityAlgorithms?: List<Phase2IntegrityAlgorithmsRequestListValue>;
  Phase1IntegrityAlgorithms?: List<Phase1IntegrityAlgorithmsRequestListValue>;
  PreSharedKey?: Value<string>;
  Phase1LifetimeSeconds?: Value<number>;
  RekeyFuzzPercentage?: Value<number>;
  Phase1EncryptionAlgorithms?: List<Phase1EncryptionAlgorithmsRequestListValue>;
  DPDTimeoutSeconds?: Value<number>;
  constructor(properties: VpnTunnelOptionsSpecification) {
    Object.assign(this, properties);
  }
}
export interface VPNConnectionProperties {
  RemoteIpv6NetworkCidr?: Value<string>;
  RemoteIpv4NetworkCidr?: Value<string>;
  VpnTunnelOptionsSpecifications?: List<VpnTunnelOptionsSpecification>;
  CustomerGatewayId: Value<string>;
  OutsideIpAddressType?: Value<string>;
  StaticRoutesOnly?: Value<boolean>;
  EnableAcceleration?: Value<boolean>;
  TransitGatewayId?: Value<string>;
  Type: Value<string>;
  LocalIpv4NetworkCidr?: Value<string>;
  VpnGatewayId?: Value<string>;
  PreSharedKeyStorage?: Value<string>;
  TransportTransitGatewayAttachmentId?: Value<string>;
  LocalIpv6NetworkCidr?: Value<string>;
  TunnelInsideIpVersion?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class VPNConnection extends ResourceBase<VPNConnectionProperties> {
  static CloudwatchLogOptionsSpecification = CloudwatchLogOptionsSpecification;
  static IKEVersionsRequestListValue = IKEVersionsRequestListValue;
  static Phase1DHGroupNumbersRequestListValue = Phase1DHGroupNumbersRequestListValue;
  static Phase1EncryptionAlgorithmsRequestListValue = Phase1EncryptionAlgorithmsRequestListValue;
  static Phase1IntegrityAlgorithmsRequestListValue = Phase1IntegrityAlgorithmsRequestListValue;
  static Phase2DHGroupNumbersRequestListValue = Phase2DHGroupNumbersRequestListValue;
  static Phase2EncryptionAlgorithmsRequestListValue = Phase2EncryptionAlgorithmsRequestListValue;
  static Phase2IntegrityAlgorithmsRequestListValue = Phase2IntegrityAlgorithmsRequestListValue;
  static VpnTunnelLogOptionsSpecification = VpnTunnelLogOptionsSpecification;
  static VpnTunnelOptionsSpecification = VpnTunnelOptionsSpecification;
  constructor(properties: VPNConnectionProperties) {
    super('AWS::EC2::VPNConnection', properties);
  }
}
