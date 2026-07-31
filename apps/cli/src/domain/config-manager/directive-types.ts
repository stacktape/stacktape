import type { ConfigResolver } from '@domain-services/config-manager/config-resolver';
export type Directive = {
  name: string;
  resolveFunction: (configResolver: ConfigResolver) => (...args: any) => any;
  localResolveFunction?: (configResolver: ConfigResolver) => (...args: any) => any;
  requiredParams: RequiredDirectivePrimitiveParams;
  lazyLoad?: boolean;
  isRuntime: boolean;
};

export type CustomDirective = Pick<Directive, 'name' | 'resolveFunction'>;

export type RequiredDirectivePrimitiveParams = { [propertyName: string]: 'boolean' | 'number' | 'string' };
