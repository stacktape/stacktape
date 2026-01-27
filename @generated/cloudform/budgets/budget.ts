// @ts-nocheck
import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoAdjustData {
  AutoAdjustType!: Value<string>;
  HistoricalOptions?: HistoricalOptions;
  constructor(properties: AutoAdjustData) {
    Object.assign(this, properties);
  }
}

export class BudgetData {
  Metrics?: List<Value<string>>;
  BudgetLimit?: Spend;
  TimePeriod?: TimePeriod;
  BillingViewArn?: Value<string>;
  AutoAdjustData?: AutoAdjustData;
  TimeUnit!: Value<string>;
  PlannedBudgetLimits?: { [key: string]: any };
  CostFilters?: { [key: string]: any };
  FilterExpression?: Expression;
  BudgetName?: Value<string>;
  CostTypes?: CostTypes;
  BudgetType!: Value<string>;
  constructor(properties: BudgetData) {
    Object.assign(this, properties);
  }
}

export class CostCategoryValues {
  MatchOptions?: List<Value<string>>;
  Values?: List<Value<string>>;
  Key?: Value<string>;
  constructor(properties: CostCategoryValues) {
    Object.assign(this, properties);
  }
}

export class CostTypes {
  IncludeSupport?: Value<boolean>;
  IncludeOtherSubscription?: Value<boolean>;
  IncludeTax?: Value<boolean>;
  IncludeSubscription?: Value<boolean>;
  UseBlended?: Value<boolean>;
  IncludeUpfront?: Value<boolean>;
  IncludeDiscount?: Value<boolean>;
  IncludeCredit?: Value<boolean>;
  IncludeRecurring?: Value<boolean>;
  UseAmortized?: Value<boolean>;
  IncludeRefund?: Value<boolean>;
  constructor(properties: CostTypes) {
    Object.assign(this, properties);
  }
}

export class Expression {
  Not?: Expression;
  Or?: List<Expression>;
  And?: List<Expression>;
  Dimensions?: ExpressionDimensionValues;
  CostCategories?: CostCategoryValues;
  Tags?: TagValues;
  constructor(properties: Expression) {
    Object.assign(this, properties);
  }
}

export class ExpressionDimensionValues {
  MatchOptions?: List<Value<string>>;
  Values?: List<Value<string>>;
  Key?: Value<string>;
  constructor(properties: ExpressionDimensionValues) {
    Object.assign(this, properties);
  }
}

export class HistoricalOptions {
  BudgetAdjustmentPeriod!: Value<number>;
  constructor(properties: HistoricalOptions) {
    Object.assign(this, properties);
  }
}

export class Notification {
  ComparisonOperator!: Value<string>;
  NotificationType!: Value<string>;
  Threshold!: Value<number>;
  ThresholdType?: Value<string>;
  constructor(properties: Notification) {
    Object.assign(this, properties);
  }
}

export class NotificationWithSubscribers {
  Subscribers!: List<Subscriber>;
  Notification!: Notification;
  constructor(properties: NotificationWithSubscribers) {
    Object.assign(this, properties);
  }
}

export class ResourceTag {
  Value?: Value<string>;
  Key!: Value<string>;
  constructor(properties: ResourceTag) {
    Object.assign(this, properties);
  }
}

export class Spend {
  Amount!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: Spend) {
    Object.assign(this, properties);
  }
}

export class Subscriber {
  SubscriptionType!: Value<string>;
  Address!: Value<string>;
  constructor(properties: Subscriber) {
    Object.assign(this, properties);
  }
}

export class TagValues {
  MatchOptions?: List<Value<string>>;
  Values?: List<Value<string>>;
  Key?: Value<string>;
  constructor(properties: TagValues) {
    Object.assign(this, properties);
  }
}

export class TimePeriod {
  Start?: Value<string>;
  End?: Value<string>;
  constructor(properties: TimePeriod) {
    Object.assign(this, properties);
  }
}
export interface BudgetProperties {
  NotificationsWithSubscribers?: List<NotificationWithSubscribers>;
  ResourceTags?: List<ResourceTag>;
  Budget: BudgetData;
}
export default class Budget extends ResourceBase<BudgetProperties> {
  static AutoAdjustData = AutoAdjustData;
  static BudgetData = BudgetData;
  static CostCategoryValues = CostCategoryValues;
  static CostTypes = CostTypes;
  static Expression = Expression;
  static ExpressionDimensionValues = ExpressionDimensionValues;
  static HistoricalOptions = HistoricalOptions;
  static Notification = Notification;
  static NotificationWithSubscribers = NotificationWithSubscribers;
  static ResourceTag = ResourceTag;
  static Spend = Spend;
  static Subscriber = Subscriber;
  static TagValues = TagValues;
  static TimePeriod = TimePeriod;
  constructor(properties: BudgetProperties) {
    super('AWS::Budgets::Budget', properties);
  }
}
