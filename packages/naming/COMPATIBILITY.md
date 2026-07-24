# Naming compatibility evidence

`@stacktape/naming` preserves infrastructure identifiers emitted by Stacktape v3 commit `17aef681`.

The committed golden corpus is generated from the v4 implementation. It is not presented as a direct v3 export.
Every package test also transpiles and invokes exact, byte-for-byte legacy source snapshots from
`test/legacy/*.ts.txt`, verifies their Git blob identities, and compares their outputs with v4. The separate case
test compares the local compatibility implementation with the exact pinned `change-case@5.4.4` package.

Compatibility dispositions:

- Logical IDs, physical names, truncation hashes, metadata keys, tags, output names, helper Lambda names, SSM paths,
  and domain-derived names are `must-preserve`.
- The legacy mutable `obfuscatedNamesStateHolder` is an implementation detail and is not retained. Callers use the
  pure `buildResourceNameInfo` result when they need the truncation signal.
- The legacy result for unrealistically small positive length limits can exceed the limit; this known v3 behavior is
  deliberately preserved.
- Filesystem/project paths, console-navigation links, and CloudFormation-evaluated links/URIs are not infrastructure
  naming algorithms and remain outside this package.

Follow-up risks:

- The synthesis migration must compare complete templates, including replacement-sensitive properties, after it
  adopts these subpaths.
- CLI composition must explicitly aggregate the `truncated` signal if it preserves the legacy warning.
- AWS service constraints still need synthesis-level coverage where the naming function alone cannot prove that the
  chosen name reaches the intended property.
