import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AmpConfiguration {
  WorkspaceArn!: Value<string>;
  constructor(properties: AmpConfiguration) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLogDestination {
  LogGroupArn?: Value<string>;
  constructor(properties: CloudWatchLogDestination) {
    Object.assign(this, properties);
  }
}

export class ComponentConfig {
  Options?: { [key: string]: Value<string> };
  constructor(properties: ComponentConfig) {
    Object.assign(this, properties);
  }
}

export class Destination {
  AmpConfiguration!: AmpConfiguration;
  constructor(properties: Destination) {
    Object.assign(this, properties);
  }
}

export class EksConfiguration {
  ClusterArn!: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds!: List<Value<string>>;
  constructor(properties: EksConfiguration) {
    Object.assign(this, properties);
  }
}

export class RoleConfiguration {
  TargetRoleArn?: Value<string>;
  SourceRoleArn?: Value<string>;
  constructor(properties: RoleConfiguration) {
    Object.assign(this, properties);
  }
}

export class ScrapeConfiguration {
  ConfigurationBlob!: Value<string>;
  constructor(properties: ScrapeConfiguration) {
    Object.assign(this, properties);
  }
}

export class ScraperComponent {
  Type!: Value<string>;
  Config?: ComponentConfig;
  constructor(properties: ScraperComponent) {
    Object.assign(this, properties);
  }
}

export class ScraperLoggingConfiguration {
  LoggingDestination!: ScraperLoggingDestination;
  ScraperComponents!: List<ScraperComponent>;
  constructor(properties: ScraperLoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class ScraperLoggingDestination {
  CloudWatchLogs?: CloudWatchLogDestination;
  constructor(properties: ScraperLoggingDestination) {
    Object.assign(this, properties);
  }
}

export class Source {
  EksConfiguration!: EksConfiguration;
  constructor(properties: Source) {
    Object.assign(this, properties);
  }
}
export interface ScraperProperties {
  ScrapeConfiguration: ScrapeConfiguration;
  Destination: Destination;
  ScraperLoggingConfiguration?: ScraperLoggingConfiguration;
  Alias?: Value<string>;
  RoleConfiguration?: RoleConfiguration;
  Source: Source;
  Tags?: List<ResourceTag>;
}
export default class Scraper extends ResourceBase<ScraperProperties> {
  static AmpConfiguration = AmpConfiguration;
  static CloudWatchLogDestination = CloudWatchLogDestination;
  static ComponentConfig = ComponentConfig;
  static Destination = Destination;
  static EksConfiguration = EksConfiguration;
  static RoleConfiguration = RoleConfiguration;
  static ScrapeConfiguration = ScrapeConfiguration;
  static ScraperComponent = ScraperComponent;
  static ScraperLoggingConfiguration = ScraperLoggingConfiguration;
  static ScraperLoggingDestination = ScraperLoggingDestination;
  static Source = Source;
  constructor(properties: ScraperProperties) {
    super('AWS::APS::Scraper', properties);
  }
}
