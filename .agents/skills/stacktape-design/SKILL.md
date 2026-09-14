---
name: stacktape-design
description:
  Redesign Stacktape's marketing website or Console through visual exploration, independent design critique, and browser
  verification. Use for substantial page, flow, or visual-system design work, including agent-led redesigns.
---

# Stacktape design

Produce an implemented design that helps the intended user understand Stacktape or operate their infrastructure. Follow
the current request and repository instructions. A website redesign does not also authorize a Console redesign. Use the
user's selected model; this skill does not require a particular model provider or paid media service.

## Method and attribution

Inspired by the accessible techniques 1–6 in Anshu Chimala's
[How to turn your AI into a world-class designer](https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world),
published September 1, 2026. Only the heading of technique 7 was accessible; this skill does not reconstruct it.

Apply this compact adaptation:

- Explore contrasting concepts before committing. Use the owner's taste to refine them.
- If exploration stalls, optionally generate a random string with a local tool as private inspiration, never content.
- Turn the chosen concept into a concrete visual brief.
- Review rendered screenshots with a fresh critic, without implementation history or previous critiques. Reference
  images can establish a quality baseline without becoming templates to copy.
- Use generated imagery selectively when it contributes meaning. Video generation is omitted from the default workflow.
- Remove elements that do not earn their place.

The following product requirements and acceptance criteria are Stacktape-specific additions. They are not a summary of
the inaccessible article. Anthropic's existing
[frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) is a related
general resource, not a prerequisite or a known adaptation of this article.

## Establish the product brief

Locate the public repository root; paths below are relative to it. Read the target application's manifest and nearest
`AGENTS.md`, and inspect current files before assuming earlier designs still exist.

Start with `README.md` for product context. When the private submodule is available, read the four documents under
`apps/console/documents/business/` for audience, messaging, and product philosophy. Use them for context without copying
private planning material into public deliverables. If unavailable, use public documentation and the user's brief;
public website work must remain possible without the Console.

For a website redesign, also consult `.agents/prompts/hero-competition.md` if present. Its owner preferences are useful
historical context, but its hero-only scope, fixed variant counts, file restrictions, and old component paths belong to
that previous task. Do not apply them to a new full-site redesign or restore deleted experiments automatically.

Write a short working brief covering audience, primary action, pages or flows in scope, verified claims, and design
constraints. Record uncertain claims as questions to resolve, rather than shipping them as facts. Check implementation
and current documentation before using pricing, performance numbers, integrations, or availability promises.

## Design for the right surface

### Marketing website

- Address developers trying to deploy without a dedicated DevOps team, and technical leaders assessing long-term fit.
  Explain deployment into the customer's own AWS account and the relationship between the open-source framework and
  hosted Console without requiring prior Stacktape knowledge.
- Use the existing brief's deployment-first CTA as a starting point: a copyable `npx stacktape init` command, with
  Console signup and a demo as supporting paths. Recheck destinations and commands. The current user brief can change
  this hierarchy. Never execute install or deployment commands merely to demonstrate a CTA.
- Build a coherent account of configuring, deploying, and operating an application. Show relevant product evidence for
  observability, delivery, cost, and infrastructure control; avoid turning every capability into an equal card.
- Render product previews and architecture diagrams with semantic HTML, React, or SVG where practical. Keep sample data
  internally consistent: the same application, stage, resources, release, and incident across related views. Clearly
  distinguish illustrative data from measured customer results. Do not invent testimonials or autonomous-fix guarantees.
  An opt-in agent action must not imply that deployments happen without the user's control.
- Keep application text readable at the size shown. A detailed Console recreation that becomes illegible on mobile needs
  a simpler representation, not merely a smaller scale.

### Console

- Optimize for frequent operational work: identifying the current project, stage, resource, state, and next action.
  Preserve routes, permissions, data contracts, and working flows unless the task explicitly changes them.
- Make loading, empty, error, permission-denied, stale, and success states part of the design. Preserve useful density
  in logs, tables, metrics, and traces. Distinguish a failed deployment from an application incident.
- Keep environment context visible around consequential actions. Explain the user-visible consequence of a choice;
  expose advanced infrastructure details progressively. Do not remove essential labels or warnings to simplify a view.
- Keep status colors and familiar controls consistent. Marketing layouts and decorative motion should not reduce
  scanability or slow repeated work. A good existing font or component does not need replacement for novelty.

## Implement and review

For a full redesign with no selected direction, a useful first deliverable is three small rendered studies using the
same real copy and CTA, so the owner can compare composition and product storytelling. For an established direction or a
focused Console flow, proceed directly to the relevant implementation. Do not multiply variants just to meet a quota.
Invite feedback while continuing independent work; if no preference is required, state a reasoned choice and proceed.

Use Astro for website content and React islands for actual interaction. Inspect `packages/design-tokens/src/tokens.ts`
before changing shared visual values; generated CSS is not an editable source. Keep website-only design decisions local.
Only place components in `packages/ui-react` when there is a real second consumer. Public code must not import private
Console source, even to recreate a marketing preview.

Use imagery only where the product story benefits. Keep UI text, configuration, architecture relationships, and logos
precise rather than embedding them in generated artwork. Do not add video, shaders, custom cursors, or scroll hijacking
by default. Any meaningful motion needs a reduced-motion alternative and must not delay access to content.

When delegation is available and authorized, assign bounded roles: one implementation owner and a critic that does not
edit files. Independent studies may use separate files or assigned worktrees; multiple agents must not overwrite the
same layout or stylesheet. Run two critique rounds initially. Continue only when unresolved findings justify more work
within the task's budget; do not chase a numerical score indefinitely. If independent critique is unavailable, perform a
separate review and disclose the limitation.

Give the critic fresh desktop and mobile screenshots, the audience/task brief, and any reference images. Use this stable
prompt:

> Review this design for the stated audience and task. Identify the three most consequential visual weaknesses and
> concrete corrections. Judge composition, hierarchy, coherence, readability, and task clarity against the references
> where supplied. Explain what should remain. Assess only visible evidence; do not infer working behavior from images.

The implementation owner resolves findings against the product requirements. Functional and accessibility checks remain
separate from visual judgment. For Console critique, use safe fixture views; do not capture authenticated private data
or override the repository's screenshot restrictions. A fixture review does not replace testing the actual flow.

## Verify and hand off

Follow `docs/testing.md` and the test plan for changed behavior. Start the website with `pnpm dev:website`; run
`pnpm --filter @stacktape/website typecheck` and `pnpm --filter @stacktape/website build` for website implementation.
Use `.agents/skills/console-development/SKILL.md` and the documented reservation procedure for Console runtime work.

Inspect the rendered result at phone, tablet, and desktop widths, including narrow screens around 360 pixels. Exercise
navigation, CTAs, copy-command feedback and failures, menus, keyboard focus, zoom, and reduced motion where relevant.
Check for overflow, clipped code, text contrast, missing assets, and browser errors. Verify Console state transitions
and permissions at the boundary affected by the change, rather than relying on screenshots alone.

For the website, check titles, descriptions, canonical URLs, indexability, social previews, and preserved analytics or
consent behavior against the intended environment. Preview pages may need `noindex`; the production site must not
accidentally inherit it. Inspect font loading, image dimensions, layout shifts, and unnecessary JavaScript. Record
measured performance evidence when claiming improvement.

Deliver the implemented pages or flow, the selected direction and rationale, browser evidence, relevant check results,
and remaining limitations. If tools cannot render or test the result, say what remains unverified. Complete the
applicable repository gate; follow existing authorization rules for publishing.
