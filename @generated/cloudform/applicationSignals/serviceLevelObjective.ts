import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BurnRateConfiguration {
  LookBackWindowMinutes!: Value<number>;
  constructor(properties: BurnRateConfiguration) {
    Object.assign(this, properties);
  }
}

export class CalendarInterval {
  DurationUnit!: Value<string>;
  StartTime!: Value<number>;
  Duration!: Value<number>;
  constructor(properties: CalendarInterval) {
    Object.assign(this, properties);
  }
}

export class DependencyConfig {
  DependencyKeyAttributes!: { [key: string]: Value<string> };
  DependencyOperationName!: Value<string>;
  constructor(properties: DependencyConfig) {
    Object.assign(this, properties);
  }
}

export class Dimension {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Dimension) {
    Object.assign(this, properties);
  }
}

export class ExclusionWindow {
  Window!: Window;
  RecurrenceRule?: RecurrenceRule;
  StartTime?: Value<string>;
  Reason?: Value<string>;
  constructor(properties: ExclusionWindow) {
    Object.assign(this, properties);
  }
}

export class Goal {
  WarningThreshold?: Value<number>;
  AttainmentGoal?: Value<number>;
  Interval?: Interval;
  constructor(properties: Goal) {
    Object.assign(this, properties);
  }
}

export class Interval {
  RollingInterval?: RollingInterval;
  CalendarInterval?: CalendarInterval;
  constructor(properties: Interval) {
    Object.assign(this, properties);
  }
}

export class Metric {
  MetricName?: Value<string>;
  Dimensions?: List<Dimension>;
  Namespace?: Value<string>;
  constructor(properties: Metric) {
    Object.assign(this, properties);
  }
}

export class MetricDataQuery {
  AccountId?: Value<string>;
  ReturnData?: Value<boolean>;
  Expression?: Value<string>;
  MetricStat?: MetricStat;
  Id!: Value<string>;
  constructor(properties: MetricDataQuery) {
    Object.assign(this, properties);
  }
}

export class MetricStat {
  Stat!: Value<string>;
  Period!: Value<number>;
  Metric!: Metric;
  Unit?: Value<string>;
  constructor(properties: MetricStat) {
    Object.assign(this, properties);
  }
}

export class MonitoredRequestCountMetric {
  GoodCountMetric?: List<MetricDataQuery>;
  BadCountMetric?: List<MetricDataQuery>;
  constructor(properties: MonitoredRequestCountMetric) {
    Object.assign(this, properties);
  }
}

export class RecurrenceRule {
  Expression!: Value<string>;
  constructor(properties: RecurrenceRule) {
    Object.assign(this, properties);
  }
}

export class RequestBasedSli {
  ComparisonOperator?: Value<string>;
  RequestBasedSliMetric!: RequestBasedSliMetric;
  MetricThreshold?: Value<number>;
  constructor(properties: RequestBasedSli) {
    Object.assign(this, properties);
  }
}

export class RequestBasedSliMetric {
  MonitoredRequestCountMetric?: MonitoredRequestCountMetric;
  OperationName?: Value<string>;
  TotalRequestCountMetric?: List<MetricDataQuery>;
  KeyAttributes?: { [key: string]: Value<string> };
  MetricType?: Value<string>;
  DependencyConfig?: DependencyConfig;
  constructor(properties: RequestBasedSliMetric) {
    Object.assign(this, properties);
  }
}

export class RollingInterval {
  DurationUnit!: Value<string>;
  Duration!: Value<number>;
  constructor(properties: RollingInterval) {
    Object.assign(this, properties);
  }
}

export class Sli {
  ComparisonOperator!: Value<string>;
  SliMetric!: SliMetric;
  MetricThreshold!: Value<number>;
  constructor(properties: Sli) {
    Object.assign(this, properties);
  }
}

export class SliMetric {
  Statistic?: Value<string>;
  OperationName?: Value<string>;
  KeyAttributes?: { [key: string]: Value<string> };
  MetricType?: Value<string>;
  PeriodSeconds?: Value<number>;
  MetricDataQueries?: List<MetricDataQuery>;
  DependencyConfig?: DependencyConfig;
  constructor(properties: SliMetric) {
    Object.assign(this, properties);
  }
}

export class Window {
  DurationUnit!: Value<string>;
  Duration!: Value<number>;
  constructor(properties: Window) {
    Object.assign(this, properties);
  }
}
export interface ServiceLevelObjectiveProperties {
  BurnRateConfigurations?: List<BurnRateConfiguration>;
  Sli?: Sli;
  Goal?: Goal;
  Description?: Value<string>;
  RequestBasedSli?: RequestBasedSli;
  ExclusionWindows?: List<ExclusionWindow>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ServiceLevelObjective extends ResourceBase<ServiceLevelObjectiveProperties> {
  static BurnRateConfiguration = BurnRateConfiguration;
  static CalendarInterval = CalendarInterval;
  static DependencyConfig = DependencyConfig;
  static Dimension = Dimension;
  static ExclusionWindow = ExclusionWindow;
  static Goal = Goal;
  static Interval = Interval;
  static Metric = Metric;
  static MetricDataQuery = MetricDataQuery;
  static MetricStat = MetricStat;
  static MonitoredRequestCountMetric = MonitoredRequestCountMetric;
  static RecurrenceRule = RecurrenceRule;
  static RequestBasedSli = RequestBasedSli;
  static RequestBasedSliMetric = RequestBasedSliMetric;
  static RollingInterval = RollingInterval;
  static Sli = Sli;
  static SliMetric = SliMetric;
  static Window = Window;
  constructor(properties: ServiceLevelObjectiveProperties) {
    super('AWS::ApplicationSignals::ServiceLevelObjective', properties);
  }
}
