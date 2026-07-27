import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface IPAMPrefixListResolverTargetProperties {
  PrefixListRegion: Value<string>;
  DesiredVersion?: Value<number>;
  PrefixListId: Value<string>;
  IpamPrefixListResolverId: Value<string>;
  Tags?: List<ResourceTag>;
  TrackLatestVersion: Value<boolean>;
}
export default class IPAMPrefixListResolverTarget extends ResourceBase<IPAMPrefixListResolverTargetProperties> {
  constructor(properties: IPAMPrefixListResolverTargetProperties) {
    super('AWS::EC2::IPAMPrefixListResolverTarget', properties);
  }
}
