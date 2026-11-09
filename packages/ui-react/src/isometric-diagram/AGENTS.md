# Isometric configuration diagram

The diagram explains infrastructure Stacktape will synthesize. It is not a direct drawing of the authored object; when
the config type and synthesizer differ, verify behavior against synthesis.

```text
StacktapeConfig -> topology.ts -> scene-builder.ts (+ layout/) -> IsoScene -> IsoRenderer.tsx
```

- `topology.ts` derives semantic nodes and edges, including implicit infrastructure.
- `scene-builder.ts` composes the scene. It decides what the layout must respect (flow edges, sources and sinks, zones,
  room for text) and maps the result to scene nodes, zone rectangles and connectors.
- `layout/` is the layout engine. It knows nodes with a size, edges and nested zones, not AWS.
- `scene.ts` is the tile-space contract. It has no SVG geometry, CSS or interaction state.
- `IsoRenderer.tsx` owns projection, drawing, pan, zoom, focus and tooltips.
- `IsometricDiagram.tsx` is the public component.

Keep those boundaries one-way. The renderer does not infer infrastructure; topology and layout do not calculate screen
geometry. The layout reasons about flat text in projected units (`layout/projected-box.ts`), never in pixels.

## Host and bundle contract

The host supplies a parsed `StacktapeConfig` and loads `@stacktape/ui-react/isometric-diagram.css`. The product-wide
icon mapping lives in `../resource-icon/catalog.ts`. Only the lazy diagram path may import the heavy isopack resolver;
ordinary icons and controls must not pull it into their bundles.

## Synthesis rules that are easy to miss

- Stacktape has public and private subnet tiers; do not invent an isolated data tier.
- Accessibility changes reachability and security groups, not database/Redis/EFS subnet placement.
- NAT applies only to supported container services and follows configured availability zones.
- Every web service has its own implicit ingress. Internal private-service ingress never connects to the public user.
- SSR resources expand into CDN, server Lambda and assets bucket; `connectTo` starts at the server Lambda.
- Batch-job events include the synthesized trigger Lambda.
- Regional managed services such as SQS and SNS are not members of a fictional VPC zone.
- Add edges only from actual directives or supported reference-bearing fields.
- Implicit node IDs contain `--`; keep IDs deterministic so layout and view state stay stable.

## Layout rules

The engine lays out the base plane in tile space and the renderer projects it; it is synchronous and deterministic. ELK
was evaluated and rejected: it lays out each compound level separately, so a VPC compound spans one column of its parent
and its subnet tiers end up side by side, which turns ALB → service → database into a backward edge.

- **Columns follow the flow.** A node sits one column after whatever triggers or feeds it: request, event and egress
  edges, and `connectTo` into a channel (queue, topic, bus, stream) or another workload. Users and schedules come first;
  data stores share the last column, so events they emit (streams, bucket triggers) are drawn as back edges. Cycles are
  cut deterministically. A node nothing feeds moves next to the first node it reaches.
- **Zones are bands.** The edge zone and the VPC, with its public tier behind the private one, span the columns of their
  members. Members stay inside, and every other node in those columns stays above or below the band.
- **Tall columns wrap** into sub-columns, because the default view fits the whole picture, whose size grows with tile
  width plus height.
- **Routes are orthogonal in tile space.** Long edges pass through shared waypoints, bundled by source or target and
  edge semantic, and turn only in the gutters between columns. They never cross a node they do not start or end at. Back
  edges reuse the same channels in reverse.
- **Flat text gets room.** Name tags under each node's front tip, the bodies in front of them and connector chips are
  kept apart in projected units. A chip sits only on route parts whose connectors share its label; a gutter widens when
  a chip has no free spot.
- **Stability.** Declaration order seeds and breaks ties in ordering and picks between mirror images, so adding or
  hiding a resource leaves the other nodes in their columns.

## Rendering rules

Use the existing 2:1 projection and preserve painter order: grid and boundaries, connectors, depth-sorted nodes,
connector chips, then zone tags. Text stays flat in screen space. Trim connector endpoints around pedestals and keep
routing deterministic. Wheel listeners stay non-passive and pointer capture supports mouse and touch.

Reset pan/zoom only when the sorted node-ID set changes. Hover is a graph focus operation, so related nodes, edges and
the explanation must agree.

## Validate changes

Update topology, icon/category mapping, explanations and at least one fixture together. Prefer semantic tests for nodes,
edges, zones and routes over whole-SVG snapshots. `layout/diagram-layout.test.ts` checks the layout rules over every
fixture and the larger configs in `test-configs/`. When layout spacing or routing changes, render the fixtures and those
configs and look at them at a 16:10 size; tests do not judge legibility.

```sh
pnpm --filter @stacktape/ui-react run test
pnpm --filter @stacktape/ui-react run typecheck
```

Use Console's `/diagram-test` route to check tooltips, zoom, drag, keyboard control, internal ingress, SSR expansion and
NAT placement in a browser.
