# @stacktape/config-authoring

This package implements the existing public TypeScript configuration language: `defineConfig`, resource and property
classes, directives, class metadata, and YAML/TypeScript conversion. It is not an operational Stacktape SDK and must
not acquire deployment, AWS, filesystem, command-execution, or Console responsibilities.

It exists because the CLI executes this runtime, the npm release assembles its public `stacktape` API from it, and the
Console editor needs the same classes and converter. Applications import this package; this package never imports an
application. The authored plain-object model remains separately owned by dependency-free `@stacktape/config`.

The root export is the customer-facing authoring runtime. Tooling and metadata use explicit subpath exports. Do not add
a wildcard export or a re-export-only compatibility layer under `apps/cli`.

`child-resources.ts` is a declarative CloudFormation-resource matrix. Its repeated lists are intentionally excluded
from the duplicate-code metric; prefer readable explicit data over builders that obscure which resources a type owns.

When changing behavior, run:

```sh
pnpm --filter @stacktape/config-authoring run typecheck
pnpm --filter @stacktape/config-authoring run test
pnpm --filter @stacktape/cli run test:config-unit
pnpm --filter @stacktape/cli run test:characterization
```
