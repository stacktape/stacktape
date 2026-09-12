# Homepage copy review

Open `index.html` in a browser. It is self-contained and works without a server.

It contains nine versions: two revisions of the recommendation, the captured original, and independent drafts from Fable
5.1, GPT-6 Astra, Grok 4.6, Gemini 3.8 Flash, DeepSeek V4.1 Flash and GLM-5.3. Each external draft has its own separate
model verification report and local source checks from the first round.

**Recommended v2** follows the user's feedback: the original headline/subheadline, no command hint or section
introduction, section 01 preserved, and sections 02–07 rewritten closer to the original direction. Compare it with
**Recommended v1** to see those changes.

- Choose a writer or the original draft.
- Use **Compare two versions** and select a section to compare equivalent content.
- Toggle the visual descriptions; no product images have been recreated.
- Click **Review notes** or select **Writer & verification notes** for roadmap flags and claim checks.
- Use **Research & run status** for the audience analysis, complete roadmap inventory and provider results.
- Each complete version has a Markdown download.

The latest recommended source is `../homepage.md`; the first is `versions/recommended-v1.md`. Independent drafts and
their notes live in `versions/`. The display parser normalizes heading levels where necessary, while downloads retain
each writer's wording. The supplied original is preserved as `versions/original.md`.

Rebuild and check the document from the repository root:

```sh
node apps/website/homepage-review/render.mjs
node apps/website/homepage-review/render.mjs --check
```

The renderer uses the website's existing `marked` dependency. No package or live website code was changed. Raw provider
process logs and request files are task-owned scratch evidence under `.stacktape/homepage-review-20260910` in the
Windows checkout; no credentials are included in these review artifacts.
