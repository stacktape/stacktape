import { dirname, join, resolve } from 'node:path';
import { pathExists, readFile } from 'fs-extra';
import { AI_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';

// ─── Types ───────────────────────────────────────────────────────────────────

type DocType = 'config-ref' | 'cli-ref' | 'concept' | 'recipe' | 'troubleshooting' | 'getting-started';

type ManifestEntry = {
  path: string;
  docType: DocType;
  title: string;
  resourceType?: string;
  tags: string[];
  priority: number;
};

type Manifest = {
  generatedAt: string;
  version: string;
  synonymMap: Record<string, string[]>;
  files: ManifestEntry[];
};

type IndexedDoc = ManifestEntry & {
  content: string;
  titleTokens: string[];
  tagTokens: string[];
  contentTokens: string[];
};

type SearchResult = {
  doc: IndexedDoc;
  score: number;
};

// ─── Tokenization ────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'out',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'and',
  'but',
  'or',
  'nor',
  'if',
  'this',
  'that',
  'these',
  'those',
  'i',
  'me',
  'my',
  'we',
  'our',
  'you',
  'your',
  'he',
  'him',
  'his',
  'she',
  'her',
  'it',
  'its',
  'they',
  'them',
  'their',
  'what',
  'which',
  'who',
  'whom'
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

// ─── BM25 Parameters ─────────────────────────────────────────────────────────

const K1 = 1.2;
const B = 0.75;

// Field boost multipliers
const FIELD_BOOSTS = {
  title: 10,
  tags: 8,
  content: 1
};

// Priority boost multipliers (priority 1 = highest)
const PRIORITY_BOOSTS: Record<number, number> = {
  1: 1.5,
  2: 1.0,
  3: 0.7
};

// ─── Lexical Index ───────────────────────────────────────────────────────────

type LexicalIndex = {
  docs: IndexedDoc[];
  synonymMap: Record<string, string[]>;
  // Inverted index: term -> Map<docIndex, frequency>
  titleIndex: Map<string, Map<number, number>>;
  tagIndex: Map<string, Map<number, number>>;
  contentIndex: Map<string, Map<number, number>>;
  // Avg field lengths for BM25
  avgTitleLen: number;
  avgTagLen: number;
  avgContentLen: number;
  totalDocs: number;
};

const buildInvertedIndex = (docs: IndexedDoc[], field: 'titleTokens' | 'tagTokens' | 'contentTokens') => {
  const index = new Map<string, Map<number, number>>();
  for (let i = 0; i < docs.length; i++) {
    const tokens = docs[i][field];
    const freq = new Map<string, number>();
    for (const token of tokens) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
    freq.forEach((count, term) => {
      if (!index.has(term)) index.set(term, new Map());
      index.get(term)!.set(i, count);
    });
  }
  return index;
};

const resolveAiDocsFolderPath = async (): Promise<string> => {
  const envPath = process.env.STACKTAPE_AI_DOCS_PATH;
  const argvPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
  const execPath = process.execPath ? resolve(process.execPath) : undefined;

  const candidates = [
    envPath,
    AI_DOCS_FOLDER_PATH,
    join(process.cwd(), 'ai-docs'),
    argvPath ? join(dirname(argvPath), 'ai-docs') : undefined,
    argvPath ? join(dirname(argvPath), '..', 'ai-docs') : undefined,
    execPath ? join(dirname(execPath), 'ai-docs') : undefined,
    execPath ? join(dirname(execPath), '..', 'ai-docs') : undefined
  ].filter(Boolean) as string[];

  for (const candidatePath of candidates) {
    if (await pathExists(join(candidatePath, 'index.json'))) {
      return candidatePath;
    }
  }

  throw new Error(
    `AI docs not found. Run 'bun run gen:ai-docs' before starting MCP. Checked: ${candidates.join(', ')}`
  );
};

const buildIndex = async (): Promise<LexicalIndex> => {
  const aiDocsFolderPath = await resolveAiDocsFolderPath();
  const manifestPath = join(aiDocsFolderPath, 'index.json');
  const manifestContent = await readFile(manifestPath, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestContent);

  const docs: IndexedDoc[] = [];

  for (const entry of manifest.files) {
    const filePath = join(aiDocsFolderPath, entry.path);
    const content = await readFile(filePath, 'utf-8');

    // Strip frontmatter from content for indexing
    const bodyContent = content.replace(/^---[\s\S]*?---\n*/, '').trim();

    docs.push({
      ...entry,
      content: bodyContent,
      titleTokens: tokenize(entry.title),
      tagTokens: entry.tags.flatMap((tag) => tokenize(tag)),
      contentTokens: tokenize(bodyContent)
    });
  }

  const titleIndex = buildInvertedIndex(docs, 'titleTokens');
  const tagIndex = buildInvertedIndex(docs, 'tagTokens');
  const contentIndex = buildInvertedIndex(docs, 'contentTokens');

  const avgTitleLen = docs.reduce((sum, d) => sum + d.titleTokens.length, 0) / docs.length;
  const avgTagLen = docs.reduce((sum, d) => sum + d.tagTokens.length, 0) / docs.length;
  const avgContentLen = docs.reduce((sum, d) => sum + d.contentTokens.length, 0) / docs.length;

  return {
    docs,
    synonymMap: manifest.synonymMap,
    titleIndex,
    tagIndex,
    contentIndex,
    avgTitleLen,
    avgTagLen,
    avgContentLen,
    totalDocs: docs.length
  };
};

// ─── BM25 Scoring ────────────────────────────────────────────────────────────

const bm25Score = (
  term: string,
  docIdx: number,
  invertedIndex: Map<string, Map<number, number>>,
  docFieldLen: number,
  avgFieldLen: number,
  totalDocs: number
): number => {
  const postings = invertedIndex.get(term);
  if (!postings) return 0;
  const tf = postings.get(docIdx);
  if (!tf) return 0;

  const df = postings.size;
  const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
  const tfNorm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docFieldLen / avgFieldLen)));

  return idf * tfNorm;
};

// ─── Query ───────────────────────────────────────────────────────────────────

type QueryOptions = {
  query: string;
  resourceType?: string;
  docType?: DocType;
  maxItems?: number;
};

const expandQuery = (tokens: string[], synonymMap: Record<string, string[]>): string[] => {
  const expanded = new Set(tokens);

  // Build reverse synonym map for expansion
  const reverseSynonyms = new Map<string, string[]>();
  for (const [key, synonyms] of Object.entries(synonymMap)) {
    for (const syn of synonyms) {
      const synTokens = tokenize(syn);
      for (const t of synTokens) {
        if (!reverseSynonyms.has(t)) reverseSynonyms.set(t, []);
        reverseSynonyms.get(t)!.push(key, ...synonyms);
      }
    }
    const keyTokens = tokenize(key);
    for (const t of keyTokens) {
      if (!reverseSynonyms.has(t)) reverseSynonyms.set(t, []);
      reverseSynonyms.get(t)!.push(...synonyms);
    }
  }

  for (const token of tokens) {
    const related = reverseSynonyms.get(token);
    if (related) {
      for (const r of related) {
        for (const rt of tokenize(r)) expanded.add(rt);
      }
    }
  }

  return Array.from(expanded);
};

const search = (index: LexicalIndex, options: QueryOptions): SearchResult[] => {
  const { query, resourceType, docType, maxItems = 3 } = options;

  const rawTokens = tokenize(query);
  if (rawTokens.length === 0) return [];

  const queryTokens = expandQuery(rawTokens, index.synonymMap);

  const scores = new Float64Array(index.totalDocs);

  for (let docIdx = 0; docIdx < index.totalDocs; docIdx++) {
    const doc = index.docs[docIdx];

    // Hard filter by resourceType if specified
    if (resourceType && doc.resourceType !== resourceType) continue;
    // Hard filter by docType if specified
    if (docType && doc.docType !== docType) continue;

    let score = 0;
    for (const token of queryTokens) {
      score +=
        FIELD_BOOSTS.title *
        bm25Score(token, docIdx, index.titleIndex, doc.titleTokens.length, index.avgTitleLen, index.totalDocs);

      score +=
        FIELD_BOOSTS.tags *
        bm25Score(token, docIdx, index.tagIndex, doc.tagTokens.length, index.avgTagLen, index.totalDocs);

      score +=
        FIELD_BOOSTS.content *
        bm25Score(token, docIdx, index.contentIndex, doc.contentTokens.length, index.avgContentLen, index.totalDocs);
    }

    // Apply priority boost
    const priorityBoost = PRIORITY_BOOSTS[doc.priority] ?? 1.0;
    score *= priorityBoost;

    // Bonus for exact resourceType match in query
    if (doc.resourceType && rawTokens.includes(doc.resourceType)) {
      score *= 1.3;
    }

    scores[docIdx] = score;
  }

  // Collect and sort results
  const results: SearchResult[] = [];
  for (let i = 0; i < index.totalDocs; i++) {
    if (scores[i] > 0) {
      results.push({ doc: index.docs[i], score: scores[i] });
    }
  }
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxItems);
};

// ─── Response Formatting ─────────────────────────────────────────────────────

const extractCodeBlocks = (content: string): { language: string; code: string }[] => {
  const blocks: { language: string; code: string }[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }
  return blocks;
};

type DocsResponse = {
  answer: string;
  references: {
    title: string;
    path: string;
    docType: DocType;
  }[];
  snippets?: {
    language: string;
    code: string;
  }[];
  nextQueries?: string[];
};

const formatAnswer = (results: SearchResult[], mode: 'answer' | 'reference' | 'snippet'): DocsResponse => {
  if (results.length === 0) {
    return {
      answer: 'No relevant documentation found for this query.',
      references: []
    };
  }

  const references = results.map((r) => ({
    title: r.doc.title,
    path: r.doc.path,
    docType: r.doc.docType
  }));

  if (mode === 'reference') {
    return {
      answer: `Found ${results.length} relevant document(s).`,
      references
    };
  }

  if (mode === 'snippet') {
    const snippets: { language: string; code: string }[] = [];
    for (const r of results) {
      const blocks = extractCodeBlocks(r.doc.content);
      if (blocks.length > 0) snippets.push(blocks[0]);
    }
    return {
      answer:
        snippets.length > 0
          ? `Found ${snippets.length} code snippet(s).`
          : 'No code snippets found in matched documents.',
      references,
      snippets: snippets.length > 0 ? snippets : undefined
    };
  }

  // mode === 'answer': return the full content of top results, trimmed for token efficiency
  const MAX_CONTENT_CHARS = 12000;
  let totalChars = 0;
  const answerParts: string[] = [];

  for (const r of results) {
    const remaining = MAX_CONTENT_CHARS - totalChars;
    if (remaining <= 0) break;

    const content = r.doc.content.slice(0, remaining);
    answerParts.push(`## ${r.doc.title}\n\n${content}`);
    totalChars += content.length;
  }

  return {
    answer: answerParts.join('\n\n---\n\n'),
    references,
    snippets: extractCodeBlocks(results[0].doc.content).slice(0, 2) || undefined
  };
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export type { DocType, DocsResponse, IndexedDoc, LexicalIndex, QueryOptions, SearchResult };
export { buildIndex, expandQuery, formatAnswer, search, tokenize };
