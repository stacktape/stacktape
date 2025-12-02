import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DefaultRouteInput {
  ActivationState!: Value<string>;
  constructor(properties: DefaultRouteInput) {
    Object.assign(this, properties);
  }
}

export class UriPathRouteInput {
  SourcePath?: Value<string>;
  AppendSourcePath?: Value<boolean>;
  ActivationState!: Value<string>;
  Methods?: List<Value<string>>;
  IncludeChildPaths?: Value<boolean>;
  constructor(properties: UriPathRouteInput) {
    Object.assign(this, properties);
  }
}
export interface RouteProperties {
  UriPathRoute?: UriPathRouteInput;
  EnvironmentIdentifier: Value<string>;
  RouteType: Value<string>;
  DefaultRoute?: DefaultRouteInput;
  ServiceIdentifier: Value<string>;
  ApplicationIdentifier: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Route extends ResourceBase<RouteProperties> {
  static DefaultRouteInput = DefaultRouteInput;
  static UriPathRouteInput = UriPathRouteInput;
  constructor(properties: RouteProperties) {
    super('AWS::RefactorSpaces::Route', properties);
  }
}
