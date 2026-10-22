# @stacktape/config-authoring

This package implements the existing public TypeScript configuration language: `defineConfig`, resource and property
classes, directives, class metadata, and YAML/TypeScript conversion. It is not an operational Stacktape SDK and must not
acquire deployment, AWS, filesystem, command-execution, or Console responsibilities.

It exists because the CLI executes this runtime, the npm release assembles its public `stacktape` API from it, and the
Console editor needs the same classes and converter. Applications import this package; this package never imports an
application. The authored plain-object model remains separately owned by dependency-free `@stacktape/config`.

The root export is the customer-facing authoring runtime. Tooling and metadata use explicit subpath exports. Do not add
a wildcard export or a re-export-only compatibility layer under `apps/cli`.

The root also exposes `@stacktape/cloudformation`'s lower-case, plain-object intrinsic helpers and
`cfnResource`/`cfnResourceUnchecked`. Re-export that canonical implementation; do not recreate CloudFormation classes,
uppercase aliases, template envelopes or intrinsic value types in this package. `cfnResource` is the checked path for
standard generated AWS resources, while `cfnResourceUnchecked` is the explicit escape hatch for third-party registry
types that are absent from the AWS service specification.

`defineConfig` is the only supported executable TypeScript-config entry point. It returns a branded compiled result
containing the serializable config and an explicit side channel for resource/final transforms. The CLI must execute a
config module and its factory once; never recover transforms by loading or invoking customer code a second time. Do not
restore the legacy named `getConfig` export or constructors that accept an explicit resource name. A resource's name is
the key under `resources`, and one class instance may not be reused under two keys. Resource objects are inert: do not
store their registered name or compilation state on the instance. Pass the object itself to `connectTo` and semantic
resource-reference properties; compilation resolves that identity through the returned `resources` object. Every class
representing an entry in `StacktapeConfig.resources` belongs in `RESOURCES_CONVERTIBLE_TO_CLASSES` and must extend
`BaseResource`; do not model a top-level resource as a generic type-properties class.

The project name and region are declared in the settings object, the first argument of
`defineConfig({ projectName, region }, fn)`. The CLI reads them statically, as string literals, before it chooses
credentials and evaluates the config; it never executes the config a second time to learn them. The runtime keeps the
settings on the returned function (`getConfigSettings`) so the CLI can check them against its static read, passes the
effective values to the callback and copies the declared values into the serializable config. A callback that returns
`projectName` or `region` is rejected. `defineConfig(fn)` without settings remains valid; its callback receives a
project name only when a CLI argument or persisted default selected one.

Resource constructor props are derived from `@stacktape/config`'s discriminated resource union. Keep that model as the
source of truth instead of hand-maintaining a parallel props hierarchy. `resources.ts` deliberately exports each runtime
class explicitly: the source exports, generator metadata, npm declarations and Monaco declarations must name the same
set of resources.

`child-resources.ts` is a declarative CloudFormation-resource matrix. Its repeated lists are intentionally excluded from
the duplicate-code metric; prefer readable explicit data over builders that obscure which resources a type owns.

When changing behavior, run:

```sh
pnpm --filter @stacktape/config-authoring run typecheck
pnpm --filter @stacktape/config-authoring run test
pnpm --filter @stacktape/cli run test:config-unit
pnpm --filter @stacktape/cli run test:characterization
pnpm --filter @stacktape/cli run build:npm:main
pnpm --filter @stacktape/cli run generate:monaco:check
```
