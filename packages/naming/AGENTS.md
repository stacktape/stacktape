# Stacktape naming

This package owns deterministic, compatibility-sensitive Stacktape names: AWS physical resource names,
CloudFormation logical IDs, workload/resource/alarm identifiers, ARNs, AWS Console links, SSM parameter paths,
Stacktape stack descriptions, output/tag/metadata names, and the truncation/hash behavior used to keep names within
service limits. Some subpaths are consumed only by synthesis today, but they share the same compatibility contract:
changing them can replace customer infrastructure or break discovery.

`stack-identity` owns the historical region + stack name + account ID hash shared by the CLI and Console. Its
separator-free concatenation is frozen compatibility behavior, including the Console default-domain suffix derived
from it.

- Preserve output byte-for-byte. A naming change can replace customer infrastructure or break discovery.
- Keep explicit subpath exports; do not add a barrel.
- Keep the dependency graph one-way: resource names may use hashing/truncation, ARNs may use resource names, and
  Console links may use ARNs/tags. Do not reintroduce a generic `utils` module or a cycle.
- Generated CloudFormation expression helpers, filesystem paths, packaging artifact keys, alarm descriptions, and
  command-local labels stay in their application.
- Add golden tests for limits, hashing, encoding, parsing, and fixed identifiers before changing behavior.
