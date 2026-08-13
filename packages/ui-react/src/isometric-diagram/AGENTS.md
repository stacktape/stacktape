# Configuration diagram maintainer guide

This diagram is a semantic explanation of the infrastructure Stacktape will synthesize, not a direct drawing of the
authored YAML/TypeScript object. A visually plausible result can still be product-incorrect. When the configuration
model and the CLI synthesizer disagree, the synthesizer is the behavioral source of truth.

## Mental model and ownership

The pipeline is one-way, and each arrow is a module boundary:

```text
StacktapeConfig → topology.ts → scene-builder.ts → IsoScene (scene.ts) → IsoRenderer.tsx
```

1. `topology.ts` converts `StacktapeConfig` into semantic nodes and edges, including infrastructure Stacktape creates
   implicitly.
2. `scene-builder.ts` assigns layers and tile coordinates, builds compound boundaries, routes connectors, and produces
   an `IsoScene`.
3. `scene.ts` is the contract between the two halves. It holds only tile-space data: no SVG geometry, no interaction
   state, no CSS. Neither the builder nor the renderer imports the other.
4. `IsoRenderer.tsx` projects that scene and owns pan, zoom, focus, tooltips, keyboard and pointer interaction. The
   isometric projection lives here and nowhere else.
5. `IsometricDiagram.tsx` is the public component: it takes a parsed configuration, derives the scene and renders it, or
   shows the empty state.

`resource-explanations.ts` is the presentation-neutral source of tooltip explanations. Keep it reusable: the marketing
website may eventually render the same concepts with a different visual implementation.

Do not mix these responsibilities. In particular, renderer code must not infer infrastructure relationships, and
topology or layout code must not depend on SVG coordinates or interaction state.

## Host contract

- The host supplies a parsed, normalized `StacktapeConfig`. This component never reads editor source, and never mutates
  the configuration it is handed.
- The host loads `@stacktape/ui-react/isometric-diagram.css`. Import it from the same module the host lazy-loads, so the
  stylesheet and the icon data travel in one chunk.
- `../resource-icon/catalog.ts` owns the small product-wide icon/category assignment. The heavy
  `../resource-icon/isopack.ts` resolver holds the `@isoflow/isopacks` catalogue—around a megabyte of inlined icons.
  Only the diagram reaches that resolver. Keep the host's diagram import lazy, and never import the isopack resolver
  from an ordinary resource-icon or primitive entry point.
- Chrome colours are `--stp-*` design-token variables. Scene colours (pedestal bodies, connector semantics) stay
  literal, because `dk()` shades them arithmetically and cannot parse a `var()` reference.

## Infrastructure invariants

These rules were checked against CLI synthesis and are easy to get wrong by reasoning from the config alone:

- The flow order is `external → edge → ingress → compute → integration → data`.
- Stacktape has public and private subnet tiers only. Do not invent an isolated/data subnet.
- Databases, Redis, EFS mount targets and load balancers use public VPC subnets. Accessibility options change
  reachability/security groups, not their subnet placement.
- `usePrivateSubnetsWithNAT` applies only to supported container services. NAT count follows
  `stackConfig.vpc.nat.availabilityZones` and otherwise defaults to two.
- Each web service has its own implicit ingress resource. An internal private-service load balancer must never receive
  an edge from the public user node.
- SSR web resources decompose into CDN, server Lambda and assets bucket nodes. `connectTo` originates from the server
  Lambda, not the aggregate web node.
- Batch-job events include the hidden trigger Lambda synthesized by the CLI.
- Regional managed services such as SQS, SNS and EventBridge are not members of a fictional network zone.
- Dependency/event edges come from actual directive/reference-bearing fields, including resource-parameter references
  and supported ARN fields. Do not connect nodes merely because a relationship seems likely.
- Implicit node IDs contain `--`. This depends on the configuration invariant that user resource names cannot contain
  `--`; keep IDs deterministic so view state and tests remain stable.

When adding or changing a resource type, compare the result with the corresponding CLI resource resolver and
configuration normalization—not just its TypeScript interface.

## Rendering and interaction invariants

- Geometry uses the flipped 2:1 isometric projection. Text is deliberately flat screen-space content rendered above all
  scene geometry; do not put names back onto projected floors or pedestal faces.
- Preserve SVG layer order: grid/boundaries → connectors → depth-sorted nodes → connector chips → zone tags. Painter
  ordering for nodes is based on `x + y`, with the closest nodes rendered last.
- Connector endpoints are trimmed around pedestals so arrowheads remain visible. Routing must be deterministic;
  otherwise ordinary config edits make the whole diagram jump.
- Wheel handling is explicitly non-passive so zoom does not scroll the surrounding page.
- Pointer capture supports mouse and touch panning.
- Reset pan/zoom only when the sorted node-ID composition changes. Property edits that keep the same nodes must preserve
  the user's view.
- Hovering a node, connector or zone is a graph focus operation: related elements remain emphasized and the explanation
  must describe the real semantic relationship.

## Change workflow

When supporting a new resource/event or changing synthesized behavior, update together:

- topology and implicit-node/edge rules;
- the shared resource-icon catalog plus diagram color and pedestal mappings;
- reusable explanations;
- at least one representative fixture in `fixtures.ts`;
- semantic scene-model assertions.

Avoid snapshotting the entire SVG. Prefer tests for topology, membership, routes, layering and interaction contracts
that correspond to user-visible correctness.

```sh
pnpm --filter @stacktape/ui-react run test
pnpm --filter @stacktape/ui-react run typecheck
```

Console's `/diagram-test` route is the visual harness. It is a development page in the private Console application that
imports this component and the fixtures below; it holds no diagram implementation. Run
`pnpm exec turbo run dev --filter=@stacktape/console-ui` and at minimum check the private-subnets, Next.js, full-stack
and media-processing fixtures; exercise node/connector/zone tooltips, wheel zoom without page scroll, mouse and touch
drag, keyboard controls, internal ingress, SSR decomposition and NAT placement.

`noUncheckedIndexedAccess` is off for this package (see `tsconfig.json`) because of the indexed geometry loops here.
Index defensively in new code rather than relying on that.
