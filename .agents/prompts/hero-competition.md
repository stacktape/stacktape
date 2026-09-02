# Stacktape homepage hero — competition brief

You are one of seven models, each producing four independent versions of the **hero section** of the new stacktape.com
homepage. The owner (Stacktape's founder) will review all 28 pages and pick a direction. Everything under "The owner's
thoughts" is his own thinking, restructured for clarity but not reinterpreted. Treat it as the contract. Everything
under "Deliverable" is orchestration so your page lands in the right place.

## What Stacktape is (facts, for grounding)

Stacktape is an AWS infrastructure and DevOps platform. A developer describes their application in one config file
(TypeScript or YAML); Stacktape compiles it to CloudFormation and deploys it into the customer's own AWS account. The
CLI/framework is open source; the hosted Console (CI/CD, observability, cost, governance) is the paid product. Recent
additions: an AI wizard (`npx stacktape init` opens a localhost UI) that reads a repository and generates the config;
integrated observability (metrics, traces, logs, alarms); an incidents feature that correlates failures with releases
and that an agent can be given to resolve. Business context the owner explicitly pointed at — read it:
`apps/console/documents/business/*.md` (ideal customer, the two personas the product is designed for, messaging, design
philosophy).

## The owner's thoughts

### Positioning — what the whole page must communicate

- "Since we added the new wizard that autogenerates the config using AI, then added all of the integrated observability
  capabilities, and created the incidents feature (that an agent can even automatically resolve) — we've basically
  automated DevOps, fully."
- "Now, really, companies without a DevOps team, with just developers, can have high-quality AWS infrastructure by
  default, with all of the advantages a DevOps team would give — in fact even much better than an average DevOps team
  does; Stacktape is even more optimized."
- Direction: **"AWS DevOps, fully automated"** — "or something like that." He chose "name the automation" as the
  headline direction over alternatives (the team-you-don't-hire angle, outcome-only phrasing, provocations). Exact
  wording is open.
- "Yet the whole page should give the impression that this is also VERY capable of fulfilling even the hardest DevOps
  challenges on AWS — so that even larger companies could be interested."
- On the AI/agent claim, his words: "It's up to the user. We will have the machinery that can automatically solve a
  problem and deploy. But it will be opt-in, and for most people it's probably too soon — they don't trust the AI so
  blindly yet. Even so, with Stacktape the fixes are WAY more successful, since Stacktape can easily give the agent the
  whole picture: we also manage the user's AWS and we see the whole observability — we see EVERYTHING — so we can
  provide the agent with exactly the right context and the right tools. I'm not yet 100% sure if we should market it, so
  that we don't scare some users away. But we could GET users if we make a bold claim. I'm not sure." → How boldly to
  play this is **your call**; he wants to see options and will ask people which they like.
- Asked which proof points would make larger companies take it seriously — networking/architecture depth (VPCs,
  private-only services, bastions, GPU/Spot), governance and control (RBAC, SSO, guardrails, budgets, audit), no lock-in
  (plain CloudFormation output, CDK-construct and raw-CloudFormation escape hatches, your own account), and migrating
  existing infrastructure — he answered: "probably all of them, if we can think of a way to show all of those." These
  are page-level; whether any belong in the hero is your decision.

### Copywriting

- Headline family: name the automation ("AWS DevOps, fully automated" territory). Subheadline and any supporting copy
  should carry the positioning above.
- He rejected the previous attempts' copy as "needs work" — write real, considered copy; no placeholders.
- He wants to compare messaging variants in context and will show them to people. Copy will be iterated further after
  the pick.
- Claims must be sourced. He previously refused an unsubstantiated superlative ("fastest packaging on the planet") and
  had benchmarks run instead; a claim that couldn't be backed was dropped. Do not invent numbers.

### The CTAs (part of the hero; his reasoning included)

- "The CTA is obvious → deploy as fast as possible, and most likely the easiest way to do that is through the CLI wizard
  — so the CTAs make sense." The CTAs mostly stay even though the hero is being rethought.
- Primary: **`npx stacktape init`** as a copyable command, with a switch for installation type/platform (npx vs. the
  install script; the install script ends by telling the user to run `stacktape init`). He is undecided whether npx or
  the install script should be the default.
- Two secondary CTAs: **Sign up** (or "deploy in console" — a web sign-up into the Console) and **Book a demo**; the
  demo may be tertiary if that makes more sense. His words: "not sure how to style this properly, come up with something
  meaningful."
- Links: sign up → https://console.stacktape.com/sign-up · demo → https://cal.com/stacktape/30min · docs →
  https://docs.stacktape.com · GitHub → https://github.com/stacktape/stacktape. Install commands (verbatim from the
  CLI): `npx stacktape init`; macOS `curl -L https://installs.stacktape.com/macos.sh | sh`; Linux
  `curl -L https://installs.stacktape.com/linux.sh | sh`; Windows
  `iwr https://installs.stacktape.com/windows.ps1 -useb | iex`. (An existing `CtaCommand` component implements this
  switcher — see Deliverable — but you may design your own.)

### The hero section itself

- **No constraints.** His words: it "can be 2 small parallel things (e.g. heading + subheading + CTA on the left and an
  infographic or animation on the right), or just heading + subheading + CTA in the middle, or whatever else layout. It
  can be creative."
- Scope of your page: a minimal nav plus the hero. Nothing below it.

### The rest of the page (context so your hero fits — not your deliverable)

- The page shows the whole experience "from automatically configuring the IaC for the given project, to deployment, to
  doing 'ops' and managing the running app." The main showcase is split into **day 0** (configuring the infrastructure,
  deploying) and **day 1** (ops, observability, management, CI/CD).
- The product screens in it are recreated as real Astro/React code — not PNGs ("images don't scale well") — reusing the
  console's UI code where possible: "pretty rendered previews of the UI."
- Day 0: the init wizard's localhost UI; **the isometric architecture diagram is very important**; the deploy.
  (`connectTo`/permissions: not important.)
- Day 1, in order: the Console project screen with two stages, one of them deploying (like
  `.github/assets/cover-transparent.png`, without its terminal overlay); observability — metrics and a trace waterfall;
  error tracking/issues — emphasize the "autofix with Claude" action (or whatever that button ends up being called);
  CI/CD — "very important" (he also singled out the EC2 GitHub Actions runner as a very good feature); costs.
- Structurally he liked a page that tells this as one continuous flow (see `apps/website/src/pages/variants/a.astro` for
  the structure only — its styling was "meh-to-okayish" and its copy was rejected). "Maybe we can even change that."

### Brand and styling

- Dark background. Keep the logo. Keep the primary color — the green from the logo (`--stp-color-brand`). Secondary
  colors may change. He wants "some modern borders, padding, spacing, box shadows etc. — or anything else you think we
  could change."
- **Use the design tokens** (`packages/design-tokens`, exposed as `--stp-*` CSS variables) — but "if you want, you can
  adjust the styling and get creative; you don't need to follow the design language precisely." **The UI must be
  beautiful.**
- Previous attempts exist in the repo — `apps/website/src/pages/variants/*`, `apps/website/src/pages/hero/*`,
  `apps/website/src/sections/hero-lab/*`. He rejected their styling and copy ("I don't like it at all"). Do not derive
  from them.

## Deliverable

Produce **one self-contained Astro page file** and output it as your entire response. The orchestrator saves your
response verbatim to `apps/website/src/pages/hero-competition/NN.astro` (NN assigned by the orchestrator), so: **no
prose, no markdown fences, nothing before the opening `---` or after the last tag.** Repository access is read-only for
you; you cannot run the dev server, so write carefully.

Your file:

```astro
---
// concept: <one sentence: the layout/visual idea>
// copy-angle: <one sentence: the messaging stance, incl. how boldly you play the AI claim>
import BaseLayout from '../../layouts/BaseLayout.astro';
import Logo from '../../components/Logo.astro';
// optional — NOTE the braces, it is a named export: import { CtaCommand } from '../../components/CtaCommand';
---

<BaseLayout title="…" description="…" font="geist" noindex>
  <!-- your nav + hero -->
</BaseLayout>

<style>
  /* Astro scopes this to your page automatically. */
</style>

<script>
  // optional vanilla JS for interaction/animation; runs in the browser.
</script>
```

Those two `// concept:` / `// copy-angle:` comment lines are mandatory and must be the first two lines of the
frontmatter — they are parsed. Keep the whole file under ~900 lines.

What you may import (existing, unmodified files; everything else must be inline in your file):

- `../../layouts/BaseLayout.astro` — props `title`, `description`, `font` (`'geist'` | `'inter'`), `noindex`; a
  `<slot name="head">` for extra `<link>`/`<style is:global>`. It sets the dark page background and loads Geist, Geist
  Mono and Inter (CSS vars `--font-geist`, `--font-geist-mono`, `--font-inter`; `font-sans` follows the `font` prop).
  Tailwind v4 utilities are available, with token aliases such as `bg-page`, `bg-element`, `text-brand`,
  `text-fc-primary`, `text-fc-secondary`, `border-border` (see `apps/website/src/styles/global.css`).
- `../../components/Logo.astro` (default export; props `height`, `class`) and `../../components/CtaCommand` (**named**
  export: `import { CtaCommand } from '../../components/CtaCommand';` props `defaultMethod`, `className`; render with
  `client:visible`). Every surface component below is likewise a **named** export matching its file name
  (`import { DeployTerminal } from '../../surfaces/DeployTerminal';`), except `DiagramIsland`, which is a default
  export.

Astro syntax traps (each one is a compile error): in Astro markup a bare `{` or `}` starts a JavaScript expression — so
code samples, JSON or TypeScript shown inside `<pre>`/`<code>` must escape every brace as `&#123;` / `&#125;` (or be
rendered from a frontmatter string via `<Fragment set:html={...} />`). Use `class`, not `className`, on plain HTML
elements. Attribute values with quotes inside need the other quote style. Do not put HTML comments inside `<style>` or
`<script>`.

- Anything under `../../surfaces/` — hand-built recreations of real product UI (server-rendered React):
  `DeployTerminal`, `MetricsPanel`, `TraceWaterfall`, `CicdPanel`, `CostsPanel`, `IssuesInbox/IssuesInbox`,
  `StageOverview/StageOverview`, `frames/{BrowserFrame,TerminalFrame,EditorFrame}`, and the real isometric architecture
  diagram: `InitWizardRun/DiagramIsland.tsx` (`client:only="react"`, props `config` from `InitWizardRun/acme-config.ts`
  `ACME_DIAGRAM_CONFIG` and `ariaLabel`; give it a fixed-height container because it renders nothing on the server).
  Read a surface's file before using it; each takes `className`.
- `../../lib/snippets/snippets.ts` in frontmatter only: `await getSnippet('nextjs-postgres')` returns
  `{ yaml: { html, lineCount }, typescript: { html } | null }` — build-time Shiki-highlighted config with schema hover
  popups (`set:html`).

Rules: do not reference files under `pages/variants`, `pages/hero`, `sections/`. No new dependencies, no new files, no
edits to anything else. Inline SVG is welcome; external images are not. Google Fonts via the head slot are fine with
fallback stacks. Respect `prefers-reduced-motion`. No horizontal page overflow at 1440 and 1024 wide; keep the hero
legible down to ~900. Design tokens: `packages/design-tokens/generated/tokens.css` lists every `--stp-*` variable and
value.

Version distinctness: you are producing one of four independent versions. If the orchestrator's preamble lists concepts
already used by your previous versions, make this one clearly different in layout, visual idea and copy angle.
