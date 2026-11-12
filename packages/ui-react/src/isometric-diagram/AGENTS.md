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
  (`buildDiagramModel`) and selects what the layers show from it (`selectDiagramView`).
- `views.ts` is the layer model: the Infrastructure and Access layers, and which nodes, connectors and zones the picture
  shows with and without them.
- `security-view.ts` is the Access layer: from a deployed stage's security groups (`security-groups.ts`) it works out
  who can connect to each resource, as one tag above it and the panel's words.
- `layout/` is the layout engine. It knows nodes with a size, edges and nested zones, not AWS.
- `scene-details.ts` builds what the side panel says: connections as drawn, an API's routes, a group's members.
- `scene.ts` is the tile-space contract. It has no SVG geometry, CSS or interaction state.
- `IsoRenderer.tsx` owns projection, drawing, pan, zoom, focus, tooltips, selection and search; `DiagramPanel.tsx` is
  the side panel.
- `IsometricDiagram.tsx` is the public component. It holds which groups are expanded and which layers are on, decides
  which layers the stage has anything for, and validates the `deployment` input. `LayerControls.tsx` is the toolbar's
  checkboxes.
- `status.ts` checks a host's live statuses and summarizes them per drawn node; `status-marks.tsx` draws them.

Keep those boundaries one-way. The renderer does not infer infrastructure; topology and layout do not calculate screen
geometry. The layout reasons about flat text in projected units (`layout/projected-box.ts`), never in pixels.

## Host and bundle contract

The host supplies a parsed `StacktapeConfig` and loads `@stacktape/ui-react/isometric-diagram.css`. The product-wide
resource category lives in `../resource-icon/catalog.ts`; the diagram colours shapes by it and draws everything else
itself, with no icon packs or images.

`layers`/`defaultLayers` and `onLayersChange` let a host keep the layers that are on (Console keeps them in the stage
tab's `layers` search parameter); `layerChoices` limits the switches, and with none there are no layer controls (the
website islands show the application picture only). `deployment` carries the deployed CloudFormation template and each
Stacktape resource's logical IDs (in Console, the `cf` template query and `getUserResourcesFromStackInfoMap`). It is
untrusted and read at the boundary. Omit it where there is no deployed stage, and the Access layer is not offered; pass
`null` for a deployed stage whose template could not be read, and its switch is disabled and says so.
`deployment-fixtures.ts` exports three configurations with their synthesized templates for Console's `/diagram-test` and
offline browser test.

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
  5–25% in area. It is part of the one layout every picture selects from, so a declared resource's pill sits in the same
  place whichever layers are on.
- **Links.** Links are anchors with an `href`; `onNavigate` lets a host follow a plain click with its router, while a
  modified click opens a new tab.
- **Notices.** What is about the whole picture (a deploy that will replace it, an incident no resource is tied to) goes
  in `notices`, drawn under the toolbar inside the frame. A host must not put such messages above the diagram: one
  appearing or going away would resize the frame and rescale every node.

## Security-group model

`security-groups.ts` derives a deployed stage's security groups from its CloudFormation template, not from the config:
accessibility modes, shared function groups, the shared network's stage group and group handovers are all decided by
synthesis. The Access layer reads it (see "Layers" below).

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

## Layers

The diagram opens on the application: the resources the configuration declares and how requests and events flow between
them, with `connectTo` access and connector labels. The reader adds two layers to it, in any combination, with the
checkboxes in the toolbar. They are named for what a developer or a CTO wants to know, not for AWS parts. Add a third
only for a question these two cannot answer, never one per AWS construct, and do not bring back preset tabs: with the
layout fixed, a preset is only a saved combination of checkboxes.

- **Infrastructure** is what Stacktape creates under the configuration: Stacktape-created resources (per-service
  gateways and load balancers, CDNs, an SSR site's server function and assets bucket, Convex's parts), the VPC, subnet
  tiers and edge zone, the NAT and outbound connectors, load balancer exposure badges (`internal`/`internet-facing`) and
  the "VPC Link" label on an HTTP API's connector into a container.
- **Access** is who can connect to each resource of a deployed stage: one tag above the resource (below). It adds
  nothing else and changes nothing in the picture. Stacktape puts databases in public subnets and protects them with
  security groups, so the two layers together are the truthful answer to "is my database reachable": never make them
  exclusive.

The layout runs once, on every node, connector and zone, and a layer only shows or hides things. A node therefore keeps
its exact tile whichever layers are on, and the renderer fits the frame of the whole picture (`IsoScene.frame`), so
switching a layer neither moves nor rescales anything. Do not lay out per combination; `views.test.ts` checks positions
across all four for every fixture, test config and template config, collapsed and expanded.

- **A layer is offered only where the stage has something for it.** Infrastructure has no switch on a stack of
  functions, APIs, queues and tables (`hasInfrastructure`). Access has none where there is no deployed stage or the
  template has no security groups (nothing runs in a VPC). A deployed stage whose template could not be read keeps the
  Access switch, disabled, with the reason, so it does not vanish on a failed request. A host that asks for a layer the
  stage has nothing for gets the picture without it.
- **Hidden Stacktape-created nodes fold into their owner** (the `<owner>` of an `<owner>--<part>` ID): their connectors
  move to the owner and are routed through the hidden node's spot, and the owner's panel lists their connections. A
  hidden node with no owner (the NAT) drops its connectors. The schedule node and any implicit node that is `isPublic`
  are in every picture: a public data store keeps its badge whatever is hidden.
- **Room for every layer is reserved in every picture:** the layout gives load balancers badge room and reserves the
  "VPC Link" chip, so nothing moves when the Infrastructure layer shows them. Access tags are not known to the layout
  (they come from the deployed template, which loads later); they are placed afterwards, in free room above their nodes.
- **Toolbar.** The layer checkboxes come first, then Find, the "need attention" chip and collapse chips; host `notices`
  take their own row under them. The Access layer's note (`viewNote`) replaces the usage hint at the bottom left.

### Access tags

`security-view.ts` reads the model from `security-groups.ts`; it never infers rules from the config.

The layer answers one question per resource, "who can connect to this?", in resource terms. An earlier version drew
security groups as coloured outlines with port-labelled arrows between them and from address ranges; readers had to
learn three notations to get one answer, so do not bring outlines, rule arrows or ports back onto the canvas. Security
groups, ports and protocols are how AWS enforces the answer and belong in the side panel.

- **One tag per node,** above it (`IsoNode.access`), with a globe when the internet can reach the node and a padlock
  when it cannot. The icon means the same whichever other layer is on, and the note under the picture says what each
  icon means, so a padlock is not read as "secure":
  - `exposed`, red: "Open to the internet" on a data store (database, Redis, OpenSearch, Kafka, EFS), or "SSH open to
    the internet", "Remote desktop open to the internet", "All ports open to the internet" on anything. Red means only
    this. The group the internet's rule is on decides whether a data store is behind it: Convex drawn as one node is
    public through its load balancer, not an open database.
  - `public`, neutral: "Public" on an entry point meant to be reached: a load balancer, a gateway, a service with a
    public port. Where no security group decides, whatever the user's request connector reaches is public too: an HTTP
    API, a CDN, a function URL, or a service drawn with its gateway. A node whose own group admits nothing, or two
    addresses, is not public because a connector reaches it.
  - `public` through a forwarder: "Public via web GW" on what a public gateway or load balancer may connect to
    (`FORWARDING_TYPES`), also through a chain of them. Its own group admits only the forwarder, but "Only web GW" with
    a padlock told readers the service was private, and the same service read "Public" once the Infrastructure layer was
    off. Three things must hold: the picture draws the forwarder sending requests to the node (a rule that only lets a
    gateway's group in forwards nothing), the node's rules let the forwarder in, and they do so under CloudFormation
    conditions the forwarder is public under. A forwarder the internet cannot reach (internal, or open to two addresses)
    passes nothing on. A name too long for the tag becomes "Public via its load balancer".
  - `limited`, quiet: "Anything in the VPC", "Only web", "Only web + 203.0.113.10", "Only 2 IP addresses", "Only 3
    resources". At most two resources are named and the text stays within 30 characters; past that it counts.
  - `closed`, quiet: "No inbound access" on what listens for connections and admits none (`LISTENING_KINDS`: a worker
    service, a bastion, a database, a load balancer). ICMP alone is not a way in. A group that admits only its own
    members is "Only itself", not closed: the service's tasks can reach each other.
  - `unknown`, quiet with a question mark: "Access unknown" on a node that carries a group the template only refers to,
    or a rule whose address range is a value set at deploy time. Either may admit the internet, so "Only web" or "Only 1
    IP range" would be a guess, and so would the note's all-clear. What the template does show still counts: an internet
    rule on another of its groups makes it `exposed` or `public`.
  - No tag: a security group does not decide who can use the node. Either it has none (a bucket, a queue, a function
    outside the VPC), or AWS starts it and nothing connects to it (a function in the VPC, a batch job, an agent
    runtime), or its group is plumbing (a NAT instance; an HTTP API's VPC Link, whose group is about the link, not the
    gateway). "No inbound access" on a function would contradict the connector from the API that calls it. The first two
    get `untaggedNote`, a sentence for the tooltip and the panel that says why there is no tag. Readers took a missing
    tag for "not checked". The sentence about AWS permissions is only for types they do protect
    (`AWS_PERMISSION_TYPES`): an Upstash database is protected by its own password and a user pool's sign-in is public,
    so those get no sentence rather than a false one.
- **A sentence beside the tag.** `access.detail` says the tag in full ("Only web and 203.0.113.10 can connect to it.").
  The tooltip and the panel show it, red for `exposed`.
- **Members map to drawn nodes** by the logical ID that carries the group first, then by owner and member kind. A
  resource that nests several resources of one kind needs the logical ID: Convex runs its backend and dashboard as two
  container services owned by `app`, and `AppDashboardContainerWorkloadService` is `app--dashboard` (stems in
  `NESTED_PART_STEMS`). By kind, a web service's load balancer is `<name>--alb` or `--nlb`, its VPC Link `<name>--gw`,
  an SSR site's function `<name>--server`, a NAT instance `nat-gateway`. Then through grouping (a collapsed member is
  its group's deck) and, without the Infrastructure layer, its folding: a service drawn with its load balancer carries
  both groups, so it is "Public" itself. A source that resolves to the node itself is not a source.
- **Never more than the template says.** These statements are about security, so each errs towards what is certain. A
  service drawn with its gateway is "Public" whatever else its own group admits. CloudFormation conditions have no
  values in the template, so a conditional rule counts as present (the tag may name more than is allowed in, never
  less), but a rule in one branch of a condition never applies to a member attached in the other. Only TCP, UDP and
  "all" can be "All ports open"; GRE or ESP from the internet is "Public".
- **Sources** are named as drawn: a collapsed role group by its name ("Only Functions"), its members once expanded. A
  group several resources carry lets the others in, not the node itself. A group with nothing drawn is named as a group.
  `access.sources` are the drawn nodes, which focusing the node keeps lit whether or not a connector joins them.
- **Placement.** A tag sits straight above its node. Where another node, a name, a badge, a connector chip, a zone's
  name or another tag is in the way it slides along the node's top or rises a row, and where nothing above is free it
  goes under the node's name. It never goes farther, where it would read as a neighbour's tag. The frame includes the
  tags of both pictures (with and without Infrastructure), so they are never cut off. `security-view.test.ts` checks
  every template for overlaps.
- **Under the tag.** The `public` mark and a load balancer's exposure badge give way to the tag, which says more about
  the same thing. The node's accessible name carries the tag's text. A tag's width comes from character widths measured
  in Chromium with Montserrat (`getAccessTagWidthPx`); `security-view.test.ts` holds the measurements.
- **The note under the picture** gives a verdict for the whole stage, then the legend. The verdict names what is
  `exposed`, or what is `unknown`, or says "No security group opens a data store or an admin port to the internet." That
  is all the layer can vouch for: a database outside the VPC (MongoDB Atlas, Upstash, DSQL) has no security group, so
  never shorten it to "nothing is open".
- **Words in the panel.** "Who can connect" gives the sentence, then the inbound rules of the groups that decide
  (`IsoNodeSecurityGroup.decides`) in plain words ("Allows TCP 5432 from web"), naming member resources rather than
  group IDs. A relational database its config opens to the internet also gets what to change (`accessFix`); an
  OpenSearch domain does not, because it cannot move between the internet and the VPC after it is created. Every group,
  with inbound and outbound rules, is folded under "Security group": most readers never need it, and a list of outbound
  defaults buried the answer. With a tag, the config's own reachability note (`accessNote`) is left out, because it
  would say the same thing twice. Group names are short: the owner ("db SG", "albWeb LB SG", "web VPC Link SG"), the
  nested part it belongs to ("app dashboard SG"), or what a stack-wide group is for ("VPC functions SG", "Stage network
  SG"); groups that would share a name say what they reach ("VPC functions SG → cache"). A group defined outside the
  stack is listed without rules, which are not in the template.
- **Bounded work.** Tags follow groups and rules, not members: 300 functions in two groups take milliseconds.

## Words

The reader is a backend or full-stack developer with little infrastructure experience (the business documents' persona
1). They hover a node to learn what it is and what it means for their app. The owner found the earlier paragraphs hard
to follow: they joined several ideas with dashes and semicolons and leaned on "synchronous", "asynchronous", "invokes"
and "fan-out".

- **A tooltip is one sentence, then at most three one-line facts,** then one highlighted line about access when there is
  one. `resource-explanations.ts` holds the rules for the sentence and the facts, and `resource-explanations.test.ts`
  holds the ones a test can check: lengths, no jargon list, no dash or semicolon joining two ideas. The same rules cover
  connector descriptions and access notes in `topology.ts`.
- **Say what happens, not what it is called.** "The caller waits for the answer", not "synchronous". "AWS takes messages
  off the queue in batches and calls the target", not "asynchronous, pull-based". Name the AWS product only where the
  reader needs it to act.
- **Keep the facts that change what the developer expects or does:** how the thing is called, whether the caller waits,
  how it scales, what is billed, a limit. Leave out what is true of every managed service.
- **The side panel shows the same sentence and facts,** so write once in `resource-explanations.ts`.
- **A host page's reset wins over this stylesheet's margins,** because the stylesheet is in a cascade layer. Space the
  tooltip's parts with the flex gap, not with margins on paragraphs.

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
  every picture.
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
each layer shows and position stability, and `security-view.test.ts` the Access layer against real templates.
`layout/diagram-layout.test.ts` checks the layout rules over every fixture and the larger configs in `test-configs/`,
each collapsed and with every group expanded, and the room for status pills; `status.test.tsx` holds the status rules.
Console's `e2e/diagram-ui.spec.ts` (offline browser lane) drives the panel, expand and collapse, search, the stage tab's
live statuses (refreshed in place), the layer checkboxes in every combination with positions compared on screen, the
`layers` search parameter, a stage with no layers to offer, the Access panel and a redeploy that drops rules in
Chromium. When layout spacing or routing changes, render the fixtures and those configs and look at them at a 16:10
size; tests do not judge legibility.

```sh
pnpm --filter @stacktape/ui-react run test
pnpm --filter @stacktape/ui-react run typecheck
```

Use Console's `/diagram-test` route to check tooltips, zoom, drag, keyboard control, the side panel, groups, search,
layers, internal ingress, SSR expansion and NAT placement in a browser; the `serverless-routes` fixture has groups and
the "Deployed: …" fixtures have security groups. When the Access layer's drawing changes, render the template configs
with their deployment with and without the Infrastructure layer and look at them; the legibility test catches overlaps,
not confusing wording.
