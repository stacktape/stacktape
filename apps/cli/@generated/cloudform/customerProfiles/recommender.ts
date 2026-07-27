import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EventParameters {
  EventValueThreshold?: Value<number>;
  EventType!: Value<string>;
  constructor(properties: EventParameters) {
    Object.assign(this, properties);
  }
}

export class EventsConfig {
  EventParametersList!: List<EventParameters>;
  constructor(properties: EventsConfig) {
    Object.assign(this, properties);
  }
}

export class Metrics {
  coverage?: Value<number>;
  hit?: Value<number>;
  similarity?: Value<number>;
  recall?: Value<number>;
  popularity?: Value<number>;
  freshness?: Value<number>;
  constructor(properties: Metrics) {
    Object.assign(this, properties);
  }
}

export class RecommenderConfig {
  EventsConfig?: EventsConfig;
  constructor(properties: RecommenderConfig) {
    Object.assign(this, properties);
  }
}

export class RecommenderUpdate {
  Status?: Value<string>;
  CreationDateTime?: Value<string>;
  RecommenderConfig?: RecommenderConfig;
  FailureReason?: Value<string>;
  LastUpdatedDateTime?: Value<string>;
  constructor(properties: RecommenderUpdate) {
    Object.assign(this, properties);
  }
}

export class TrainingMetrics {
  Metrics?: Metrics;
  Time?: Value<string>;
  constructor(properties: TrainingMetrics) {
    Object.assign(this, properties);
  }
}
export interface RecommenderProperties {
  RecommenderName: Value<string>;
  RecommenderRecipeName: Value<string>;
  Description?: Value<string>;
  DomainName: Value<string>;
  RecommenderConfig?: RecommenderConfig;
  Tags?: List<ResourceTag>;
}
export default class Recommender extends ResourceBase<RecommenderProperties> {
  static EventParameters = EventParameters;
  static EventsConfig = EventsConfig;
  static Metrics = Metrics;
  static RecommenderConfig = RecommenderConfig;
  static RecommenderUpdate = RecommenderUpdate;
  static TrainingMetrics = TrainingMetrics;
  constructor(properties: RecommenderProperties) {
    super('AWS::CustomerProfiles::Recommender', properties);
  }
}
