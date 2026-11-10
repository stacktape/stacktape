# Isometric configuration diagram

The diagram explains infrastructure Stacktape will synthesize. It is not a direct drawing of the authored object; when
the config type and synthesizer differ, verify behavior against synthesis.

```text
StacktapeConfig -> topology.ts -> grouping.ts -> scene-builder.ts (+ layout/) -> views.ts (+ security-view.ts) -> IsoScene -> IsoRenderer.tsx
```

- `topology.ts` derives semantic nodes and edges, including implicit infrastructure, and the triggers behind them
  (routes, subscriptions, schedules).
- `grouping.ts` collapses functions and batch jobs that play one role into a group node and merges their connectors.
- `scene-builder.ts` composes the scene. It decides what the layout must respect (flow edges, sources and sinks, zones,
  room for text) and maps the result to scene nodes, zone rectangles and connectors. It lays out the whole picture once
  (`buildDiagramModel`) and selects a view from it (`selectDiagramView`).
- `views.ts` is the view model: the Application, Network and Security presets, the overlays behind them, and which
  nodes, connectors and zones each overlay shows.
- `security-view.ts` draws a deployed stage's security groups from `security-groups.ts`: outlines, rule arrows and the
  panel's words.
- `layout/` is the layout engine. It knows nodes with a size, edges and nested zones, not AWS.
- `scene-details.ts` builds what the side panel says: connections as drawn, an API's routes, a group's members.
- `scene.ts` is the tile-space contract. It has no SVG geometry, CSS or interaction state.
- `IsoRenderer.tsx` owns projection, drawing, pan, zoom, focus, tooltips, selection and search; `DiagramPanel.tsx` is
  the side panel.
- `IsometricDiagram.tsx` is the public component. It holds which groups are expanded and which view and overlays are
  shown, and validates the `deployment` input. `ViewControls.tsx` is the switcher and its Customize popover.
- `status.ts` checks a host's live statuses and summarizes them per drawn node; `status-marks.tsx` draws them.

Keep those boundaries one-way. The renderer does not infer infrastructure; topology and layout do not calculate screen
geometry. The layout reasons about flat text in projected units (`layout/projected-box.ts`), never in pixels.

## Host and bundle contract

The host supplies a parsed `StacktapeConfig` and loads `@stacktape/ui-react/isometric-diagram.css`. The product-wide
resource category lives in `../resource-icon/catalog.ts`; the diagram colours shapes by it and draws everything else
itself, with no icon packs or images.

`view`/`defaultView` and `onViewChange` let a host keep the view (Console keeps it in the stage tab's `view` search
parameter); `views` limits the switcher, and with one view there are no view controls (the website islands show the
Application view only). `deployment` carries the deployed CloudFormation template and each Stacktape resource's logical
IDs (in Console, the `cf` template query and `getUserResourcesFromStackInfoMap`). It is untrusted and read at the
boundary. Omit it where there is no deployed stage; pass `null` for a deployed stage whose template could not be read,
so the Security view says so instead of "appear for deployed stages". `deployment-fixtures.ts` exports three
configurations with their synthesized templates for Console's `/diagram-test` and offline browser test.

`onOpenResource(resourceName)` is optional. When a host passes it, the side panel offers to open declared resources
(never implicit ones or groups); `canOpenResource` narrows that to the ones the host can show. Console opens its
resource dialog through the stage's `selectedResourceName` search parameter. The panel, search and group controls sit
inside the diagram's frame, so they work in any host, the website islands included.

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

## Live status

A host that knows how a deployed stage is doing passes `statuses`: per declared resource name, a list of
`{ tone, text, detail?, href? }`. The diagram knows nothing about where they come from; Console builds them from open
incidents, open errors and critical or high security findings (`StageDetails/diagram-status.ts`).

- **Tones.** `critical` is broken now, `warning` needs attention, `ok` and `unknown` are informational. Only the first
  two ring the node (solid red, dashed amber) and count in the toolbar's "N resources need attention" chip, which dims
  everything else like search does. Text is always drawn too, and each tone has its own icon shape, so colour is never
  the only signal.
- **Checked at the boundary.** `readStatuses` drops statuses without text, reads an unknown tone as `unknown`, bounds
  text and keeps only relative or http(s) links. Implicit nodes never carry a status, and names the scene does not draw
  are ignored.
- **On a node.** A pill under the name tag shows the worst status and "+N" for the rest; the count survives truncation.
  A collapsed group takes its worst member's tone and says how many members share it ("2 of 18 failing", "1 of 4
  flagged"). The tooltip lists the first statuses and the side panel lists all of them with their links; a group's panel
  names the member of each, and its member list repeats each member's worst status.
- **Nothing moves.** Statuses are applied to a scene that is already laid out. Passing `statuses` at all, even `{}`,
  makes the scene builder reserve a pill's room (`STATUS_LINE_HEIGHT_PX`, at least `STATUS_MIN_WIDTH_PX` wide) under
  every declared resource and group, so a host passes it from its first render while data loads. Without the prop the
  layout is exactly as before (website islands, `/diagram-test`). The reservation spreads a stage diagram by roughly
  5–25% in area. It is part of the one layout every view selects from, so a declared resource's pill sits in the same
  place in the Application, Network and Security views.
- **Links.** Links are anchors with an `href`; `onNavigate` lets a host follow a plain click with its router, while a
  modified click opens a new tab.
- **Notices.** What is about the whole picture (a deploy that will replace it, an incident no resource is tied to) goes
  in `notices`, drawn under the toolbar inside the frame. A host must not put such messages above the diagram: one
  appearing or going away would resize the frame and rescale every node.

## Security-group model

`security-groups.ts` derives a deployed stage's security groups from its CloudFormation template, not from the config:
accessibility modes, shared function groups, the shared network's stage group and group handovers are all decided by
synthesis. The Security view draws it (see "Views" below).

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

## Views

The layout runs once, on every node, connector and zone, and a view only hides things. A node therefore keeps its exact
tile in every view that shows it, and the renderer fits the frame of the whole picture (`IsoScene.frame`), so switching
views neither moves nor rescales anything. Do not lay out per view; `views.test.ts` checks positions across every view
for every fixture, test config and template config, collapsed and expanded.

- **Presets set overlays.** Application: your resources and how requests and events flow (permissions and labels on).
  Network: adds Stacktape-created resources, the VPC, subnet tiers and edge zone, the NAT and outbound connectors, load
  balancer exposure badges (`internal`/`internet-facing`) and the "VPC Link" label on an HTTP API's connector into a
  container. Security: Stacktape-created resources, security groups, permissions and labels. Changing an overlay in
  Customize shows "Custom"; picking a preset again restores its overlays. Security does not nest inside Network.
- **Hidden Stacktape-created nodes fold into their owner** (the `<owner>` of an `<owner>--<part>` ID): their connectors
  move to the owner and are routed through the hidden node's spot, and the owner's panel lists their connections. A
  hidden node with no owner (the NAT) drops its connectors. The schedule node and any implicit node that is `isPublic`
  are never hidden: a public data store keeps its badge in every view.
- **Room for every view is reserved in every view:** the layout gives load balancers badge room and reserves the "VPC
  Link" chip, so nothing moves when the Network view shows them.
- **Toolbar.** The view switcher and Customize come first, then Find, the "need attention" chip and collapse chips; host
  `notices` take their own row under them. The Security view's legend or note (`viewNote`) replaces the usage hint at
  the bottom left.
- **The Security view mutes request, event and egress connectors** and keeps firewalls, authorizers and `connectTo`
  (IAM) access at full strength. Without deployment data it shows that config-level picture with a note.

### Security groups

`security-view.ts` reads the model from `security-groups.ts`; it never infers rules from the config.

- **Members map to drawn nodes** by the logical ID that carries the group first, then by owner and member kind. A
  resource that nests several resources of one kind needs the logical ID: Convex runs its backend and dashboard as two
  container services owned by `app`, and `AppDashboardContainerWorkloadService` is `app--dashboard` (stems in
  `NESTED_PART_STEMS`). By kind, a web service's load balancer is `<name>--alb` or `--nlb`, its VPC Link `<name>--gw`,
  an SSR site's function `<name>--server`, a NAT instance `nat-gateway`. Then through grouping (a collapsed member is
  its group's deck) and the view's folding. VPC endpoints and compute environments have no node and are listed in the
  group's tooltip.
- **Outlines** are chamfered floor rectangles in the group's colour (dashed grey for an external group). Members that
  are neighbours with nothing between them share one outline (found on a grid, so hundreds of members stay cheap);
  others get one each. The largest three outlines of a group carry its name tab. A node in several groups gets nested
  outlines: one that holds another sits farther out, and outlines that only share members sit at different distances.
- **Arrows go from group to group,** never from member to member: one per source and target group, labelled with its
  ports ("TCP 5432") in the source group's colour and starting at the source group's outline. It follows the first
  connector between members of the two groups and replaces it; otherwise it joins the closest pair and is routed along
  the gutters next to them and a free lane between. Ports that only some conditions allow say so ("TCP 80 if Prod").
  Work is bounded by groups and rules (`MAX_GROUP_ARROWS`), not members: two groups of 150 functions and one rule are
  one arrow, and every view of them takes milliseconds.
- **Address ranges** (internet, VPC, CIDR, prefix list, or a group with nothing drawn) get a short arrow into the
  group's largest outline: red for `0.0.0.0/0`/`::/0`, amber otherwise. Each address gets its own arrow, never one label
  for several, which would lend one address another's ports. Past three per group, one more arrow says "N more address
  ranges" without ports; its tooltip and the panel list each. Only a load balancer's first internet rule (IPv4 before
  IPv6) follows the user's connector, because that is what users reach; a VPC Link's does not. Every arrow's ID names
  its source and target (`sg-rule-<group><-internet:::/0`), so no two share one and an arrow leaves with its rule when
  the template changes. Self-references and egress rules are not drawn; the panel lists them.
- **Words.** Each node's panel lists its groups with inbound and outbound rules in plain words ("Allows TCP 5432 from
  web", "Allows all outbound traffic (the AWS default)"), naming member resources rather than group IDs. Group names are
  short: the owner ("db SG", "albWeb LB SG", "web VPC Link SG"), the nested part it belongs to ("app dashboard SG"), or
  what a stack-wide group is for ("VPC functions SG", "Stage network SG"); groups that would share a name say what they
  reach ("VPC functions SG → cache").
- **Text placement.** Rule chips and tabs are placed clear of node bodies, name tags and other chips, on the line when
  it has room and just beside it otherwise. `security-view.test.ts` checks them against every template.

## Role groups

Many functions with the same job make an unreadable picture, so they are drawn as one group until the reader expands it.
Grouping is a stage on the topology, not a renderer feature.

- Functions, and separately batch jobs, form a group when at least `MIN_GROUP_SIZE` (3) share a role: the same set of
  incoming request, event and security sources (an API, a queue, a topic, a schedule, a stream, a bucket, an API that
  calls them as its authorizer, or none) and the same subnet. Declared triggers with no drawn sender (an external queue
  or topic by ARN, MSK or self-managed Kafka, a CloudWatch alarm or log group) count too, by sender identity, and the
  panel lists them. Implicit nodes and data stores are never grouped.
- Labels come from the role: "<api> routes", "<queue> consumers", "<topic> subscribers", "Scheduled jobs", "Functions"
  for untriggered ones; the VPC copy of a duplicate label says "(VPC)". The type line counts members ("18 functions").
- Group IDs are `group--<type>--<signature>[--<subnet>]`: deterministic, independent of declaration order, and unable to
  collide with resource names. A group takes its first member's place in the node order, so expanding or collapsing it
  keeps every other node in its flow column.
- Connectors touching a collapsed group merge into one per neighbour and semantic, with a count. Requests from an API
  read "N routes" (counted from triggers, not functions); a uniform event label (`poll`, a schedule rate) stays and
  mixed ones become a count; a dependency's tooltip says "used by 7 of 18 functions". Relations between members of one
  group are not drawn; the panel lists them per member. Connectors between ungrouped nodes are untouched.
- Groups start collapsed. The deck's "+" control, the panel and the toolbar's collapse chips change that in place.

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
- **Live status lines.** With `statusLines`, every name tag but an implicit node's is taller and at least as wide as a
  status pill, and the layout keeps pills clear of bodies, chips, zone tags and each other like any name tag.
- **Tall columns wrap** into sub-columns, because the default view fits the whole picture, whose size grows with tile
  width plus height. Columns of up to eight stay single, so a few data stores do not re-wrap when one more is added.
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

Use the existing 2:1 projection and preserve painter order: grid and boundaries, security-group outlines, connectors,
security rule arrows, depth-sorted nodes (shape, badges, name tag), connector chips, rule chips, group tabs, then zone
tags.

- `scene.ts` carries a semantic `shape`, `category` and optional `glyph` per node; `node-appearance.ts` picks them from
  the resource type and the catalog, and holds the sizes the layout reserves (shape heights, badges, name lengths).
  `node-shapes.tsx` owns every pixel of a shape: a silhouette per kind, the body in the AWS category colour, at most one
  flat white glyph on a top face. Add a shape there before reusing a generic one.
- Draw replicas literally: database instances as side-by-side cylinders (writer first), NAT gateways as one slab each,
  container tasks as cubes for the minimum and dashed cubes up to the maximum, with a small range badge. A group is a
  `deck` of three slabs in its members' colour with their glyph, a filled count badge and a round "+" to expand it.
- Name tags have two lines: the resource name and a muted type line from the topology.
- A data store reachable from the internet by its accessibility mode carries a red `public` badge. Keep it visible in
  every view.
- Zone tags are rotated to the edge the layout chose. Other text stays flat in screen space. Connector labels say
  something specific (schedule rate, poll, push, stream, HTTPS, an authorizer); a plain synchronous call needs none.

Trim connector endpoints around node footprints and keep routing deterministic. Wheel listeners stay non-passive and
pointer capture supports mouse and touch.

Reset pan/zoom only when the sorted node-ID set changes (expanding a group refits the view). Hover is a graph focus
operation, so related nodes, edges and the explanation must agree; keyboard focus on a node does the same.

## Interaction rules

- Every node is a focusable button. Click, Enter or Space opens the side panel: name, type, the tooltip's explanation,
  connections in and out grouped by kind, an API's route table (method, path, target, authorizer) and a group's members
  with their triggers and connections. Escape closes it and returns focus to the node that opened it.
- A press becomes a drag only after it moves a few pixels, so clicks reach nodes; a click on empty canvas closes the
  panel.
- "Find resource" dims everything that does not match by name and rings what does, without moving anything; a group
  matches when one of its members does. Enter opens the first match.
- Hovering a security group's outline or tab explains what it allows and focuses its members and the nodes its rules
  connect them with; hovering a rule arrow focuses its two ends.

## Validate changes

Update topology, the category mapping and node appearance, explanations and at least one fixture together. Prefer
semantic tests for nodes, edges, zones and routes over whole-SVG snapshots; `synthesis.test.ts` holds the
synthesizer-checked rules for resource types and relations, `grouping.test.ts` the grouping rules, `views.test.ts` what
each view shows and position stability, and `security-view.test.ts` the Security view against real templates.
`layout/diagram-layout.test.ts` checks the layout rules over every fixture and the larger configs in `test-configs/`,
each collapsed and with every group expanded, and the room for status pills; `status.test.tsx` holds the status rules.
Console's `e2e/diagram-ui.spec.ts` (offline browser lane) drives the panel, expand and collapse, search, the stage tab's
live statuses (refreshed in place), view switching with positions compared on screen, Customize, the `view` search
parameter, the Security panel and a redeploy that drops rules in Chromium. When layout spacing or routing changes,
render the fixtures and those configs and look at them at a 16:10 size; tests do not judge legibility.

```sh
pnpm --filter @stacktape/ui-react run test
pnpm --filter @stacktape/ui-react run typecheck
```

Use Console's `/diagram-test` route to check tooltips, zoom, drag, keyboard control, the side panel, groups, search,
views, internal ingress, SSR expansion and NAT placement in a browser; the `serverless-routes` fixture has groups and
the "Deployed: …" fixtures have security groups. When the Security view's drawing changes, render the template configs
with their deployment in each view and look at them; the legibility test catches overlaps, not confusing arrows.
