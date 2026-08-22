# Isometric configuration diagram

The diagram explains infrastructure Stacktape will synthesize. It is not a direct drawing of the authored object; when
the config type and synthesizer differ, verify behavior against synthesis.

```text
StacktapeConfig -> topology.ts -> scene-builder.ts -> IsoScene -> IsoRenderer.tsx
```

- `topology.ts` derives semantic nodes and edges, including implicit infrastructure.
- `scene-builder.ts` assigns layers, tiles, compounds and connector routes.
- `scene.ts` is the tile-space contract. It has no SVG geometry, CSS or interaction state.
- `IsoRenderer.tsx` owns projection, drawing, pan, zoom, focus and tooltips.
- `IsometricDiagram.tsx` is the public component.

Keep those boundaries one-way. The renderer does not infer infrastructure; topology and layout do not calculate screen
geometry.

## Host and bundle contract

The host supplies a parsed `StacktapeConfig` and loads `@stacktape/ui-react/isometric-diagram.css`. The product-wide
icon mapping lives in `../resource-icon/catalog.ts`. Only the lazy diagram path may import the heavy isopack resolver;
ordinary icons and controls must not pull it into their bundles.

## Synthesis rules that are easy to miss

- Flow is `external -> edge -> ingress -> compute -> integration -> data`.
- Stacktape has public and private subnet tiers; do not invent an isolated data tier.
- Accessibility changes reachability and security groups, not database/Redis/EFS subnet placement.
- NAT applies only to supported container services and follows configured availability zones.
- Every web service has its own implicit ingress. Internal private-service ingress never connects to the public user.
- SSR resources expand into CDN, server Lambda and assets bucket; `connectTo` starts at the server Lambda.
- Batch-job events include the synthesized trigger Lambda.
- Regional managed services such as SQS and SNS are not members of a fictional VPC zone.
- Add edges only from actual directives or supported reference-bearing fields.
- Implicit node IDs contain `--`; keep IDs deterministic so layout and view state stay stable.

## Rendering rules

Use the existing 2:1 projection and preserve painter order: grid and boundaries, connectors, depth-sorted nodes,
connector chips, then zone tags. Text stays flat in screen space. Trim connector endpoints around pedestals and keep
routing deterministic. Wheel listeners stay non-passive and pointer capture supports mouse and touch.

Reset pan/zoom only when the sorted node-ID set changes. Hover is a graph focus operation, so related nodes, edges and
the explanation must agree.

## Validate changes

Update topology, icon/category mapping, explanations and at least one fixture together. Prefer semantic tests for nodes,
edges, zones and routes over whole-SVG snapshots.

```sh
pnpm --filter @stacktape/ui-react run test
pnpm --filter @stacktape/ui-react run typecheck
```

Use Console's `/diagram-test` route to check tooltips, zoom, drag, keyboard control, internal ingress, SSR expansion and
NAT placement in a browser.
