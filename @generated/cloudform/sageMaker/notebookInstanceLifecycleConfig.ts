import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class NotebookInstanceLifecycleHook {
  Content?: Value<string>;
  constructor(properties: NotebookInstanceLifecycleHook) {
    Object.assign(this, properties);
  }
}
export interface NotebookInstanceLifecycleConfigProperties {
  OnStart?: List<NotebookInstanceLifecycleHook>;
  NotebookInstanceLifecycleConfigName?: Value<string>;
  OnCreate?: List<NotebookInstanceLifecycleHook>;
}
export default class NotebookInstanceLifecycleConfig extends ResourceBase<NotebookInstanceLifecycleConfigProperties> {
  static NotebookInstanceLifecycleHook = NotebookInstanceLifecycleHook;
  constructor(properties?: NotebookInstanceLifecycleConfigProperties) {
    super('AWS::SageMaker::NotebookInstanceLifecycleConfig', properties || {});
  }
}
