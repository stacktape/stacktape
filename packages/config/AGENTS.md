# @stacktape/config

This package owns the user-authored configuration model: resources, shared properties, CloudFormation escape hatches and
closed deployment vocabularies such as supported regions and Fargate CPU/memory combinations.

The plain data model is separate from `@stacktape/config-authoring`, which provides runtime classes, directives and
conversion. CLI-resolved configuration and command/runtime state stay in the CLI.

## Ownership rules

- A declaration belongs here when it is reachable from `StacktapeConfig` or is another public authored-config type.
  Prefixes such as `Stp` do not decide ownership.
- The package may depend only on the dependency-free CloudFormation vocabulary. It never imports an application.
- Do not add Node, Bun, AWS, packaging, logging or command concerns.
- `connectTo` accepts authored resource objects or their names. Broad service permission macros are not part of this
  model.
- Use explicit modules. The root exports `StacktapeConfig`, `./shared` exports inherited authored primitives, and other
  modules use their own subpaths. Do not add a barrel or compatibility alias layer.

`generated/config-schema.json` has the same owner and is exported as `@stacktape/config/config-schema.json`. The CLI
generator derives it from this model; applications consume the package export rather than copying it.

## JSDoc is product content

JSDoc under `src` becomes schema descriptions, editor hovers, documentation and published npm declarations. Treat it as
customer-facing source.

- `src` is excluded from oxfmt because formatting would rewrite published descriptions.
- Use ordinary comments for internal notes.
- Keep examples valid in both the schema and generated declarations.

The package intentionally permits open JSON values where the product accepts arbitrary CDK, state-machine, EventBridge
or provider structures. Do not replace those with invented narrow types only to satisfy a lint rule.

## Checks

The acceptance projects compile without ambient Node/Bun types and with library checking enabled. They catch accidental
runtime/global dependencies that the CLI's looser project can hide.

```sh
pnpm --filter @stacktape/config run typecheck
pnpm --filter @stacktape/cli run generate:check
pnpm --filter @stacktape/cli run test:characterization
pnpm --filter @stacktape/cli run typecheck
```

`exactOptionalPropertyTypes` stays off because optional YAML properties model omitted keys, and the CLI merges defaults
over loaded plain objects.
