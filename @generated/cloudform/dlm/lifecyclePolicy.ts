import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  CrossRegionCopy!: List<CrossRegionCopyAction>;
  Name!: Value<string>;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class ArchiveRetainRule {
  RetentionArchiveTier!: RetentionArchiveTier;
  constructor(properties: ArchiveRetainRule) {
    Object.assign(this, properties);
  }
}

export class ArchiveRule {
  RetainRule!: ArchiveRetainRule;
  constructor(properties: ArchiveRule) {
    Object.assign(this, properties);
  }
}

export class CreateRule {
  IntervalUnit?: Value<string>;
  Scripts?: List<Script>;
  Times?: List<Value<string>>;
  CronExpression?: Value<string>;
  Interval?: Value<number>;
  Location?: Value<string>;
  constructor(properties: CreateRule) {
    Object.assign(this, properties);
  }
}

export class CrossRegionCopyAction {
  Target!: Value<string>;
  EncryptionConfiguration!: EncryptionConfiguration;
  RetainRule?: CrossRegionCopyRetainRule;
  constructor(properties: CrossRegionCopyAction) {
    Object.assign(this, properties);
  }
}

export class CrossRegionCopyDeprecateRule {
  IntervalUnit!: Value<string>;
  Interval!: Value<number>;
  constructor(properties: CrossRegionCopyDeprecateRule) {
    Object.assign(this, properties);
  }
}

export class CrossRegionCopyRetainRule {
  IntervalUnit!: Value<string>;
  Interval!: Value<number>;
  constructor(properties: CrossRegionCopyRetainRule) {
    Object.assign(this, properties);
  }
}

export class CrossRegionCopyRule {
  TargetRegion?: Value<string>;
  Target?: Value<string>;
  DeprecateRule?: CrossRegionCopyDeprecateRule;
  Encrypted!: Value<boolean>;
  CmkArn?: Value<string>;
  RetainRule?: CrossRegionCopyRetainRule;
  CopyTags?: Value<boolean>;
  constructor(properties: CrossRegionCopyRule) {
    Object.assign(this, properties);
  }
}

export class CrossRegionCopyTarget {
  TargetRegion?: Value<string>;
  constructor(properties: CrossRegionCopyTarget) {
    Object.assign(this, properties);
  }
}

export type CrossRegionCopyTargets = List<CrossRegionCopyTarget>;

export class DeprecateRule {
  IntervalUnit?: Value<string>;
  Count?: Value<number>;
  Interval?: Value<number>;
  constructor(properties: DeprecateRule) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfiguration {
  Encrypted!: Value<boolean>;
  CmkArn?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class EventParameters {
  EventType!: Value<string>;
  SnapshotOwner!: List<Value<string>>;
  DescriptionRegex?: Value<string>;
  constructor(properties: EventParameters) {
    Object.assign(this, properties);
  }
}

export class EventSource {
  Type!: Value<string>;
  Parameters?: EventParameters;
  constructor(properties: EventSource) {
    Object.assign(this, properties);
  }
}

export type ExcludeTags = List<ResourceTag>;

export type ExcludeVolumeTypesList = List<VolumeTypeValues>;

export class Exclusions {
  ExcludeBootVolumes?: Value<boolean>;
  ExcludeTags?: ExcludeTags;
  ExcludeVolumeTypes?: ExcludeVolumeTypesList;
  constructor(properties: Exclusions) {
    Object.assign(this, properties);
  }
}

export class FastRestoreRule {
  IntervalUnit?: Value<string>;
  AvailabilityZones?: List<Value<string>>;
  Count?: Value<number>;
  Interval?: Value<number>;
  constructor(properties: FastRestoreRule) {
    Object.assign(this, properties);
  }
}

export class Parameters {
  ExcludeBootVolume?: Value<boolean>;
  ExcludeDataVolumeTags?: List<ResourceTag>;
  NoReboot?: Value<boolean>;
  constructor(properties: Parameters) {
    Object.assign(this, properties);
  }
}

export class PolicyDetails {
  PolicyLanguage?: Value<string>;
  ResourceTypes?: List<Value<string>>;
  Schedules?: List<Schedule>;
  PolicyType?: Value<string>;
  CreateInterval?: Value<number>;
  Parameters?: Parameters;
  ExtendDeletion?: Value<boolean>;
  Exclusions?: Exclusions;
  Actions?: List<Action>;
  ResourceType?: Value<string>;
  RetainInterval?: Value<number>;
  EventSource?: EventSource;
  CrossRegionCopyTargets?: CrossRegionCopyTargets;
  TargetTags?: List<ResourceTag>;
  ResourceLocations?: List<Value<string>>;
  CopyTags?: Value<boolean>;
  constructor(properties: PolicyDetails) {
    Object.assign(this, properties);
  }
}

export class RetainRule {
  IntervalUnit?: Value<string>;
  Count?: Value<number>;
  Interval?: Value<number>;
  constructor(properties: RetainRule) {
    Object.assign(this, properties);
  }
}

export class RetentionArchiveTier {
  IntervalUnit?: Value<string>;
  Count?: Value<number>;
  Interval?: Value<number>;
  constructor(properties: RetentionArchiveTier) {
    Object.assign(this, properties);
  }
}

export class Schedule {
  ShareRules?: List<ShareRule>;
  DeprecateRule?: DeprecateRule;
  TagsToAdd?: List<ResourceTag>;
  CreateRule?: CreateRule;
  VariableTags?: List<ResourceTag>;
  FastRestoreRule?: FastRestoreRule;
  ArchiveRule?: ArchiveRule;
  RetainRule?: RetainRule;
  CrossRegionCopyRules?: List<CrossRegionCopyRule>;
  Name?: Value<string>;
  CopyTags?: Value<boolean>;
  constructor(properties: Schedule) {
    Object.assign(this, properties);
  }
}

export class Script {
  ExecutionHandlerService?: Value<string>;
  ExecutionTimeout?: Value<number>;
  Stages?: List<Value<string>>;
  ExecutionHandler?: Value<string>;
  MaximumRetryCount?: Value<number>;
  ExecuteOperationOnScriptFailure?: Value<boolean>;
  constructor(properties: Script) {
    Object.assign(this, properties);
  }
}

export class ShareRule {
  TargetAccounts?: List<Value<string>>;
  UnshareIntervalUnit?: Value<string>;
  UnshareInterval?: Value<number>;
  constructor(properties: ShareRule) {
    Object.assign(this, properties);
  }
}

export type VolumeTypeValues = Value<string>;
export interface LifecyclePolicyProperties {
  ExecutionRoleArn?: Value<string>;
  DefaultPolicy?: Value<string>;
  CreateInterval?: Value<number>;
  Description?: Value<string>;
  ExtendDeletion?: Value<boolean>;
  Exclusions?: Exclusions;
  State?: Value<string>;
  CrossRegionCopyTargets?: CrossRegionCopyTargets;
  PolicyDetails?: PolicyDetails;
  Tags?: List<ResourceTag>;
  RetainInterval?: Value<number>;
  CopyTags?: Value<boolean>;
}
export default class LifecyclePolicy extends ResourceBase<LifecyclePolicyProperties> {
  static Action = Action;
  static ArchiveRetainRule = ArchiveRetainRule;
  static ArchiveRule = ArchiveRule;
  static CreateRule = CreateRule;
  static CrossRegionCopyAction = CrossRegionCopyAction;
  static CrossRegionCopyDeprecateRule = CrossRegionCopyDeprecateRule;
  static CrossRegionCopyRetainRule = CrossRegionCopyRetainRule;
  static CrossRegionCopyRule = CrossRegionCopyRule;
  static CrossRegionCopyTarget = CrossRegionCopyTarget;
  static DeprecateRule = DeprecateRule;
  static EncryptionConfiguration = EncryptionConfiguration;
  static EventParameters = EventParameters;
  static EventSource = EventSource;
  static Exclusions = Exclusions;
  static FastRestoreRule = FastRestoreRule;
  static Parameters = Parameters;
  static PolicyDetails = PolicyDetails;
  static RetainRule = RetainRule;
  static RetentionArchiveTier = RetentionArchiveTier;
  static Schedule = Schedule;
  static Script = Script;
  static ShareRule = ShareRule;
  constructor(properties?: LifecyclePolicyProperties) {
    super('AWS::DLM::LifecyclePolicy', properties || {});
  }
}
