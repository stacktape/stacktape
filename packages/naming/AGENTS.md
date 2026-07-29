# Stacktape naming

This package owns deterministic, compatibility-sensitive names shared by the public CLI and private Console:
AWS physical resource names, ARNs, AWS Console links, SSM parameter paths, Stacktape stack descriptions, output/tag
names, and the truncation/hash behavior used to keep names within service limits.

- Preserve output byte-for-byte. A naming change can replace customer infrastructure or break discovery.
- Keep explicit subpath exports; do not add a barrel.
- Keep the dependency graph one-way: resource names may use hashing/truncation, ARNs may use resource names, and
  Console links may use ARNs/tags. Do not reintroduce a generic `utils` module or a cycle.
- Application-specific logical names, generated CloudFormation helpers, filesystem paths, packaging artifact keys,
  and command-local labels stay in their application.
- Add golden tests for limits, hashing, encoding, parsing, and fixed identifiers before changing behavior.
