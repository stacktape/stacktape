import type { StacktapeResourceReferenceableParam } from '@domain-services/config-manager/resolved-types/resources';
export const resourceReferencableParams: { [funcName: string]: (...args: any) => StacktapeResourceReferenceableParam } =
  {
    // this key (referencable param name) should not be changed. It could in some cases cause breaking change for existing deployments
    redisSharding() {
      return 'sharding';
    }
  };
