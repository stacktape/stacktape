# Phase 2: MCP Server — `stacktape_docs` Tool

Build the local MCP server binary/entrypoint and the first tool: `stacktape_docs`.

## Architecture

- MCP server runs as a local stdio process (spawned by MCP client).
- Entry command: `stacktape mcp` (or separate binary/script).
- Uses `@modelcontextprotocol/sdk` for MCP protocol handling.
- Lexical retrieval engine operates on the `@generated/ai-docs/` corpus from Phase 1.

## Lexical retrieval engine

### Indexing (at startup)

1. Read `@generated/ai-docs/index.json` manifest.
2. Load all doc files.
3. Build inverted index: tokenize title + content + tags.
4. Store term frequencies, document frequencies, field info.

### Query pipeline

1. Normalize query (lowercase, tokenize).
2. Expand with synonym map (same map from Phase 1).
3. Score with BM25 across all docs.
4. Apply field boosts:
   - `title` match: 10x
   - `tags` match: 8x
   - `resourceType` match: 8x
   - `content` match: 1x
5. Apply priority boost from frontmatter (priority 1 gets 1.5x, priority 3 gets 0.7x).
6. If `resourceType` filter provided, hard-filter to matching docs.
7. Return top-k results (default 3).

### Response formatting

Based on `mode`:

- `answer`: synthesize concise answer from top chunks + citations.
- `reference`: return title + path + docType for top-k.
- `snippet`: extract best code block from top match.

## Implementation steps

1. Add MCP server entrypoint (e.g. `src/commands/mcp/index.ts`).
2. Implement lexical index builder + BM25 scorer.
3. Implement `stacktape_docs` tool registration with schema from Phase 0.
4. Wire up retrieval pipeline.
5. Test with representative queries.

## Exit criteria

- `stacktape mcp` starts stdio MCP server.
- `stacktape_docs` tool responds to queries with relevant results.
- Results include frontmatter-based citations and correct doc types.
- Response size is bounded (token-efficient).
