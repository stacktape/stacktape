// `CreationPolicy`, `DeletionPolicy`, `UpdatePolicy` and the raw resource shape are the authored
// CloudFormation escape hatch and are owned by @stacktape/config. They are re-exported here because the
// generated resource modules import them from this path; `ResourceBase` and `ResourceTag` are emission
// machinery and stay.
export { DeletionPolicy, type CreationPolicy, type UpdatePolicy } from '@stacktape/config/cloudformation';
import type {
  CloudformationResource,
  CreationPolicy,
  List,
  UpdatePolicy,
  Value
} from '@stacktape/config/cloudformation';
import { DeletionPolicy } from '@stacktape/config/cloudformation';

type Resource = CloudformationResource;
export default Resource;

export abstract class ResourceBase<TProperties extends object = { [key: string]: any }> implements Resource {
  Type: string;
  DependsOn?: Value<string> | List<string>;
  Properties: TProperties;
  Metadata?: { [key: string]: any };
  CreationPolicy?: CreationPolicy;
  DeletionPolicy?: DeletionPolicy;
  UpdatePolicy?: UpdatePolicy;
  Condition?: Value<string>;

  protected constructor(type: string, properties: TProperties) {
    this.Type = type;
    this.Properties = properties;
  }

  dependsOn(dependencies: Value<string> | List<string>) {
    this.DependsOn = dependencies;
    return this;
  }

  metadata(metadata: { [key: string]: any }) {
    this.Metadata = metadata;
    return this;
  }

  creationPolicy(policy: CreationPolicy) {
    this.CreationPolicy = policy;
    return this;
  }

  deletionPolicy(policy: DeletionPolicy) {
    this.DeletionPolicy = policy;
    return this;
  }

  updatePolicy(policy: UpdatePolicy) {
    this.UpdatePolicy = policy;
    return this;
  }

  condition(condition: Value<string>) {
    this.Condition = condition;
    return this;
  }
}

export class ResourceTag {
  constructor(
    public Key: Value<string>,
    public Value: Value<string>
  ) {}
}
