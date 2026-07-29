import type { RESOURCE_DEFAULTS } from '@config';
import { getStpNameForResource } from '@shared/naming/utils';
import type { ResourceOverrides, StacktapeResourceDefinition } from '@stacktape/config/shared';

/**
 * The `type` discriminator of every resource a user can author in `resources`.
 *
 * This is deliberately narrower than the global `StpResourceType`, which also covers the helper Lambdas Stacktape
 * synthesizes itself and therefore never reads out of the configuration.
 */
export type StacktapeResourceType = StacktapeResourceDefinition['type'];

/** The authored definitions keyed by their discriminator, so a type can be looked up by name. */
type ResourceDefinitionsByType = {
  [TDefinition in StacktapeResourceDefinition as TDefinition['type']]: TDefinition;
};

/** The authored definition for one resource type, as it appears in `config.resources`. */
export type ResourceDefinitionOf<TResourceType extends StacktapeResourceType> =
  ResourceDefinitionsByType[TResourceType];

/** The authored `properties` bag for one resource type, as the definition declares it. */
type AuthoredPropertiesOf<TResourceType extends StacktapeResourceType> = NonNullable<
  ResourceDefinitionOf<TResourceType>['properties']
>;

/**
 * The authored properties for one resource type, as they look once raised to the top level.
 *
 * Flattening costs a correlation the nested shape carried for free: inside a definition, "the bag is present" and "the
 * bag's required members are present" are the same fact, and once the members sit at the top level they are not. A
 * definition whose `properties` is optional may legally omit it — `aws-cdk-construct` and `web-app-firewall` each
 * declare a required member (`entryfilePath`, `scope`) inside an optional bag — and normalization then yields an
 * object carrying only the identity. So a resource that may omit its bag gets `Partial`: every flattened member is
 * optional, because any of them may be absent. Only a resource whose definition demands its bag can carry the authored
 * requiredness through unchanged.
 */
export type ResourcePropertiesOf<TResourceType extends StacktapeResourceType> =
  ResourceDefinitionOf<TResourceType> extends { properties: unknown }
    ? AuthoredPropertiesOf<TResourceType>
    : Partial<AuthoredPropertiesOf<TResourceType>>;

/**
 * An authored resource definition flattened for CLI use: the authored properties raised to the top level, plus the
 * identity `ConfigManager` constructs for it.
 *
 * This is the honest result of authored-to-runtime normalization and nothing more. Families that need resolved fields
 * — a Lambda's `handler` and `cfLogicalName`, a service's `_nestedResources` — build them in their own getter, on top
 * of this shape.
 *
 * `TParentType` names the resource the definition was authored under. It equals `TResourceType` for a top-level
 * resource and differs for one synthesized inside a composite resource, such as the load balancer a Convex stack
 * brings with it.
 */
export type NormalizedResource<
  TResourceType extends StacktapeResourceType,
  TParentType extends StacktapeResourceType = TResourceType
> = ResourcePropertiesOf<TResourceType> & {
  name: string;
  type: TResourceType;
  nameChain: string[];
  configParentResourceType: TParentType;
  overrides?: ResourceOverrides;
};

/**
 * The defaults `mergeStacktapeDefaults` fills for one resource type, read back off the table rather than restated
 * beside it. Most resource types declare none, and their entry reads `{}`.
 */
export type ResourceDefaultsOf<TResourceType extends StacktapeResourceType> = (typeof RESOURCE_DEFAULTS)[TResourceType];

/**
 * A normalized resource after `mergeStacktapeDefaults` has run over it.
 *
 * The intersection is the whole mechanism. `RESOURCE_DEFAULTS` is an object literal, so every key it supplies — at
 * every level it nests — is required in that entry's inferred type, and intersecting makes exactly those keys required
 * here. A key the table does not mention keeps whatever the authored schema said about it, which is why this is the
 * honest difference between the two shapes rather than a deep `Required` that would promise the rest as well. A type
 * whose entry is `{}` intersects to `NormalizedResource` unchanged.
 *
 * Requiredness is all it is meant to add. That holds for the table as it stands because every default there widens to
 * its authored value type — the compiler-checked constraint on `RESOURCE_DEFAULTS` contextually types each entry, and
 * nothing there is written `as const`. An intersection does not guarantee that in general: a default narrowed to a
 * literal would narrow the property here too, and would then reject an authored value the schema allows. The
 * compile-time tests beside the runtime ones pin representative authored overrides for exactly that reason.
 */
export type DefaultedResource<
  TResourceType extends StacktapeResourceType,
  TParentType extends StacktapeResourceType = TResourceType
> = NormalizedResource<TResourceType, TParentType> & ResourceDefaultsOf<TResourceType>;

/**
 * Reads the CloudFormation overrides a definition may carry.
 *
 * Not every resource type accepts them — `mongo-db-atlas-cluster` is provisioned through Atlas, not CloudFormation —
 * so the property is looked up rather than assumed.
 */
export const getAuthoredOverrides = (definition: StacktapeResourceDefinition): ResourceOverrides | undefined =>
  'overrides' in definition ? definition.overrides : undefined;

/**
 * How one resource a composite resource brings with it is addressed: the chain it is synthesized under, the dotted
 * name a configuration references it by, and the Stacktape resource name its physical and logical names derive from.
 */
export type NestedResourceIdentity = {
  nameChain: string[];
  stpReferenceableName: string;
  stpResourceName: string;
};

/**
 * Builds the identity of one nested resource from its parent and the identifier the parent files it under.
 *
 * The Stacktape name depends on the *authored parent's* type rather than the child's: `getStpNameForResource` keeps
 * several parent families on their original naming so that a nested resource is not renamed — and therefore not
 * replaced — by a change here.
 */
export const getNestedResourceIdentity = (
  parent: { nameChain: string[]; type: StacktapeResourceType },
  nestedResourceIdentifier: string
): NestedResourceIdentity => {
  const nameChain = [...parent.nameChain, nestedResourceIdentifier];
  return {
    nameChain,
    stpReferenceableName: nameChain.join('.'),
    stpResourceName: getStpNameForResource({ nameChain, parentResourceType: parent.type })
  };
};
