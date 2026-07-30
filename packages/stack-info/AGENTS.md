# Stacktape stack-info contracts

This package owns the compatibility-sensitive stack-info payload embedded in CloudFormation outputs and the explicit
normalization used by Console consumers.

- The deployed wire format uses the historical `referencableParams` spelling. Do not rename it in the wire types or
  CLI producers without an explicit migration for already-deployed stacks.
- Console-facing normalized types use `referenceableParams`. Normalize once at an I/O boundary; do not recursively
  rename arbitrary objects in application code.
- Keep this package limited to stack-info contracts and transformations. Resource calculation, CloudFormation access,
  UI presentation, and generic object utilities stay with their owning applications.
- Keep explicit subpath exports; do not add a barrel.
- Add compatibility tests for both top-level and nested resources when changing the payload.
