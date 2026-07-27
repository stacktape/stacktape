import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PackageVersionArtifact {
  S3Location!: S3Location;
  constructor(properties: PackageVersionArtifact) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  Bucket!: Value<string>;
  Version!: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class Sbom {
  S3Location!: S3Location;
  constructor(properties: Sbom) {
    Object.assign(this, properties);
  }
}
export interface SoftwarePackageVersionProperties {
  Description?: Value<string>;
  PackageName: Value<string>;
  Recipe?: Value<string>;
  Attributes?: { [key: string]: Value<string> };
  Sbom?: Sbom;
  VersionName?: Value<string>;
  Artifact?: PackageVersionArtifact;
  Tags?: List<ResourceTag>;
}
export default class SoftwarePackageVersion extends ResourceBase<SoftwarePackageVersionProperties> {
  static PackageVersionArtifact = PackageVersionArtifact;
  static S3Location = S3Location;
  static Sbom = Sbom;
  constructor(properties: SoftwarePackageVersionProperties) {
    super('AWS::IoT::SoftwarePackageVersion', properties);
  }
}
