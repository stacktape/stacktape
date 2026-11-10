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
resource category lives in `../resource-icon/catalog.ts`; the diagram colours shapes by it and draws everything else
itself, with no icon packs or images.

## Synthesis rules that are easy to miss

- Stacktape has public and private subnet tiers; do not invent an isolated data tier.
- Accessibility changes reachability and security groups, not database/Redis/EFS subnet placement.
- Private subnets and the NAT exist for container services with `usePrivateSubnetsWithNAT`, AgentCore runtimes that
  connect to a database or Redis, and, once `stackConfig.nat` is set, every VPC function. NAT follows the configured
  availability zones.
- Kafka clusters, like databases, Redis and EFS, sit in the public subnets.
- Convex expands into its ALB, backend and dashboard containers (public subnets), Postgres database and storage buckets.
- MongoDB Atlas accessibility is project-wide, under `providerConfig.mongoDbAtlas`, and defaults to the internet.
- Uptime checks, synthetic tests and custom-resource instances are not drawn: the checks watch a URL, not a resource,
  and an instance is one deploy-time call of its definition, whose type line counts them.
- `security` edges come from `useFirewall` (on an ALB, web service, user pool, hosting bucket, SSR site or `cdn`) and
  from route authorizers (Cognito user pool or Lambda function) and AppSync user-pool sign-in.
- An enabled `cdn` on an HTTP API, ALB, function or bucket adds a CDN node that takes the user's edge; its
  `edgeFunctions` and `routeRewrites` targets hang off that CDN.
- Every web service has its own implicit ingress. Internal private-service ingress never connects to the public user.
- SSR resources expand into CDN, server Lambda and assets bucket; `connectTo` starts at the server Lambda.
- Batch-job events include the synthesized trigger Lambda.
- Regional managed services such as SQS and SNS are not members of a fictional VPC zone.
- Add edges only from actual directives or supported reference-bearing fields.
- Implicit node IDs contain `--`; keep IDs deterministic so layout and view state stay stable.

## Security-group model

`security-groups.ts` derives a deployed stage's security groups from its CloudFormation template, not from the config:
accessibility modes, shared function groups, the shared network's stage group and group handovers are all decided by
synthesis. It is not wired into the renderer yet; the Security view will consume it.

- **Input.** The template's `Resources` as parsed JSON or YAML (untrusted), and each Stacktape resource with the logical
  IDs it owns (in Console, `getUserResourcesFromStackInfoMap` and the keys of `cloudformationChildResources`).
- **Groups.** Template groups keep their owning resource, which stack-wide groups (shared function groups, batch
  instances, NAT instances, the stage group, Kafka endpoints) do not have. A group referred to by a literal ID, an
  import, a parameter or an unreadable expression becomes an `external:` group with no known rules.
- **Members.** Read from where groups are attached: functions, ECS services (blue/green included), launch templates and
  instances, network interfaces, RDS, ElastiCache, OpenSearch, MSK, load balancers, VPC links and endpoints, EFS mount
  targets, Batch compute environments and AgentCore runtimes. A batch job joins its compute environment's groups through
  its state machine and job queue. Instances that attach an interface without a source/destination check are NAT
  instances.
- **Rules.** Inline and standalone ingress/egress, plus the allow-all egress EC2 adds to a group that declares none.
  Peers are a group, the internet (`0.0.0.0/0`, `::/0`), the CIDR of a VPC the template creates, another CIDR, a prefix
  list, or an unresolved expression. In the shared network the stage group stands in for the VPC CIDR.
- **Robustness.** It never throws. `Fn::If` keeps both branches and records the condition (`Name` or `!Name`), as does a
  resource's `Condition`; `AWS::NoValue` drops out; unreadable ports or protocols are `unknown`.

Known gaps: a reused VPC's CIDR is not in the template, so rules that admit it show as a plain CIDR. Custom resources
that only pass group IDs along (the tagging schedule, an ECS release-command task that runs as its workload) are not
members. MongoDB Atlas access lists are not modelled. A group whose declared egress exists only in some `Fn::If`
branches gets no default egress.

The tests read real templates from `generated/security-group-templates/`, which
`apps/cli/tests/synthesis-families/security-group-fixtures.ts` synthesizes offline (`bun` that file to refresh them; the
generator lives in the CLI because a package must not import it). Its spec fails when a resolver change makes them
stale; regenerate, review the template diff and update `security-groups.test.ts`.

## Layout rules

The engine lays out the base plane in tile space and the renderer projects it; it is synchronous and deterministic. ELK
was evaluated and rejected: it lays out each compound level separately, so a VPC compound spans one column of its parent
and its subnet tiers end up side by side, which turns ALB → service → database into a backward edge.

- **Columns follow the flow.** A node sits one column after whatever triggers or feeds it: request, event and egress
  edges, a firewall's `security` edge, and `connectTo` into a channel (queue, topic, bus, stream, Kafka, email) or
  another workload. Users and schedules come first; data stores share the last column, so events they emit (streams,
  bucket triggers) are drawn as back edges. Cycles are cut deterministically. A node nothing feeds moves next to the
  first node it reaches.
- **Zones are bands.** The edge zone and the VPC, with its public tier behind the private one, span the columns of their
  members. Members stay inside, and every other node in those columns stays above or below the band.
- **Tall columns wrap** into sub-columns, because the default view fits the whole picture, whose size grows with tile
  width plus height.
- **Routes are orthogonal in tile space.** Long edges pass through shared waypoints, bundled by source or target and
  edge semantic, and turn only in the gutters between columns. They never cross a node they do not start or end at. Back
  edges reuse the same channels in reverse.
- **Flat text gets room.** Name tags under each node's front tip, the bodies in front of them (each as tall as its shape
  plus any badge) and connector chips are kept apart in projected units. A chip sits only on route parts whose
  connectors share its label; a gutter widens when a chip has no free spot.
- **Zone tags run along a zone edge.** The engine lays each before the chips: inside the front-left edge first, then the
  other edges, then just outside them, at the first spot no body, name tag or earlier tag covers.
- **Stability.** Declaration order seeds and breaks ties in ordering and picks between mirror images, so adding or
  hiding a resource leaves the other nodes in their columns.

## Rendering rules

Use the existing 2:1 projection and preserve painter order: grid and boundaries, connectors, depth-sorted nodes (shape,
badges, name tag), connector chips, then zone tags.

- `scene.ts` carries a semantic `shape`, `category` and optional `glyph` per node; `node-appearance.ts` picks them from
  the resource type and the catalog, and holds the sizes the layout reserves (shape heights, badges, name lengths).
  `node-shapes.tsx` owns every pixel of a shape: a silhouette per kind, the body in the AWS category colour, at most one
  flat white glyph on a top face. Add a shape there before reusing a generic one.
- Draw replicas literally: database instances as side-by-side cylinders (writer first), NAT gateways as one slab each,
  container tasks as cubes for the minimum and dashed cubes up to the maximum, with a small range badge.
- Name tags have two lines: the resource name and a muted type line from the topology.
- A data store reachable from the internet by its accessibility mode carries a red `public` badge. Keep it visible in
  every view.
- Zone tags are rotated to the edge the layout chose. Other text stays flat in screen space. Connector labels say
  something specific (schedule rate, poll, push, stream, HTTPS, an authorizer); a plain synchronous call needs none.

Trim connector endpoints around node footprints and keep routing deterministic. Wheel listeners stay non-passive and
pointer capture supports mouse and touch.

Reset pan/zoom only when the sorted node-ID set changes. Hover is a graph focus operation, so related nodes, edges and
the explanation must agree.

## Validate changes

Update topology, the category mapping and node appearance, explanations and at least one fixture together. Prefer
semantic tests for nodes, edges, zones and routes over whole-SVG snapshots; `synthesis.test.ts` holds the
synthesizer-checked rules for resource types and relations. `layout/diagram-layout.test.ts` checks the layout rules over
every fixture and the larger configs in `test-configs/`. When layout spacing or routing changes, render the fixtures and
those configs and look at them at a 16:10 size; tests do not judge legibility.

```sh
pnpm --filter @stacktape/ui-react run test
pnpm --filter @stacktape/ui-react run typecheck
```

Use Console's `/diagram-test` route to check tooltips, zoom, drag, keyboard control, internal ingress, SSR expansion and
NAT placement in a browser.
