import { RESOURCE_DEFAULTS } from '@config';
import { UnexpectedError } from '@utils/errors';
import type { DefaultedResource, NormalizedResource, StacktapeResourceType } from '../normalized-resource';

/**
 * Property names the walk below hands to a dedicated handler instead of merging structurally.
 *
 * No entry in `RESOURCE_DEFAULTS` currently supplies a `container`, so this handler is unreachable today. It exists
 * for the historical shape where one container default is applied to every member of a multi-container workload.
 */
const specialMergeBehaviorProperties: Record<string, ((from: any, to: any) => void) | undefined> = {
  container: (from, to) => {
    if (to.container) {
      merge(from.container, to.container);
    } else {
      to.containers.forEach((container) => {
        merge(from.container, container);
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
      } else if (to[prop] !== undefined) {
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
            // The normalized resource is a shallow copy of the working configuration. Copy only the branch that
            // defaults are about to extend so recursive merging cannot write generated leaves back into that config.
            to[prop] = { ...to[prop] };
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
 * It holds for every entry in `RESOURCE_DEFAULTS` today. A future singular `container` default would need its own
 * typed contract because the special handler applies it to `containers[]` rather than adding a top-level property.
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
 * The top-level copy and the merge's copy-on-write descent keep the working resolved configuration unchanged while
 * cloning only branches that overlap nested defaults.
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
