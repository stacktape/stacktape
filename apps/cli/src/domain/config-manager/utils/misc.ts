import { RESOURCE_DEFAULTS } from '@config';
import { removePropertiesFromObject, serialize } from '@shared/utils/misc';
import { UnexpectedError } from '@utils/errors';
import type { StacktapeConfig } from '@stacktape/config';
import type { DefaultedResource, NormalizedResource, StacktapeResourceType } from '../normalized-resource';

/**
 * Property names the walk below hands to a dedicated handler instead of merging structurally.
 *
 * No entry in `RESOURCE_DEFAULTS` currently supplies a `container`, so this handler is unreachable today. Its
 * fallback branch assigns to the `forEach` parameter and therefore would not update the array it walks; that is
 * recorded as known behavior debt and deliberately left alone here.
 */
const specialMergeBehaviorProperties: Record<string, ((from: any, to: any) => void) | undefined> = {
  container: (from, to) => {
    if (to.container) {
      merge(from.container, to.container);
    } else {
      to.containers.forEach((container) => {
        container = merge(from.container, container);
      });
    }
  }
};

/**
 * Merges `from` into `to` in place. The values are deliberately `any`: this walks two objects of arbitrary shape and
 * decides what to do per property at runtime.
 */
const merge = (from: Record<string, any>, to: Record<string, any>) => {
  if (from) {
    for (const prop in from) {
      if (specialMergeBehaviorProperties[prop]) {
        specialMergeBehaviorProperties[prop](from, to);
      } else if (to[prop]) {
        if (typeof from[prop] === 'object') {
          if (typeof to[prop] !== 'object') {
            throw new UnexpectedError({
              customMessage: `Can't merge defaults. Property ${prop} has different type (${from[prop]}, ${to[prop]})`
            });
          }
          if (Array.isArray(from[prop])) {
            if (!Array.isArray(to[prop])) {
              throw new UnexpectedError({
                customMessage: `Can't merge defaults. Property ${prop} has different type (${from[prop]}, ${to[prop]})`
              });
            }
            to[prop] = to[prop].concat(from[prop]);
          } else {
            merge(from[prop], to[prop]);
          }
        }
      } else if (typeof from[prop] === 'object') {
        if (Array.isArray(from[prop])) {
          const emptyArray: unknown[] = [];
          to[prop] = emptyArray.concat(from[prop]);
        } else {
          to[prop] = {};
          merge(from[prop], to[prop]);
        }
      } else {
        to[prop] = from[prop];
      }
    }
  }
};

/**
 * Merges a defaults object into a resource in place, and records what that leaves behind.
 *
 * The assertion states the one postcondition the walk above establishes and the checker cannot derive from it: when
 * this returns, every property `from` supplies is present on `to`. It is the merge's own promise, kept next to the
 * merge, rather than a cast repeated at each place a defaulted property is read. This mutates `to` as well as
 * narrowing it, hence the action name.
 *
 * It holds for every entry in `RESOURCE_DEFAULTS` today. It would stop holding for a `container` default, because
 * `specialMergeBehaviorProperties` intercepts that name and its fallback branch does not assign one.
 */
function applyDefaults<TResource extends object, TDefaults extends object>(
  from: TDefaults,
  to: TResource
): asserts to is TResource & TDefaults {
  merge(from, to);
}

/**
 * Copies a normalized resource and fills in the defaults its type declares.
 *
 * The copy is shallow, exactly as before: a nested default merged into an authored object writes into that object,
 * which the working resolved configuration still shares. That is recorded behavior debt, not something this typing
 * changes.
 */
export const mergeStacktapeDefaults = <
  TResourceType extends StacktapeResourceType,
  TParentType extends StacktapeResourceType
>(
  resourceDefinition: NormalizedResource<TResourceType, TParentType>
): DefaultedResource<TResourceType, TParentType> => {
  const res: NormalizedResource<TResourceType, TParentType> = { ...resourceDefinition };
  // merge(globalDefaults, res);
  applyDefaults(RESOURCE_DEFAULTS[resourceDefinition.type], res);
  return res;
};

export const cleanConfigForMinimalTemplateCompilerMode = (conf: StacktapeConfig): StacktapeConfig => {
  const cleanedConfig = removePropertiesFromObject(serialize(conf), [
    'budgetControl',
    'customDomains',
    'directives'
  ]) as StacktapeConfig;
  for (const key in cleanedConfig?.resources || {}) {
    if (cleanedConfig.resources[key].type === 'aws-cdk-construct') {
      delete cleanedConfig[key];
    }
  }
  return cleanedConfig;
};
