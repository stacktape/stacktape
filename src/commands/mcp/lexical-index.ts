import { dirname, join, resolve } from 'node:path';
import { pathExists, readFile } from 'fs-extra';
import { LLM_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';

// ─── Types ───────────────────────────────────────────────────────────────────

type DocKind = 'docs-page' | 'config-reference';

type LlmDocChunk = {
  id: string;
  pageId: string;
  title: string;
  route: string;
  sourcePath: string;
  headingPath: string[];
  docKind: DocKind;
  resourceType?: string;
  definitionNames: string[];
  tags: string[];
  content: string;
};

type IndexedDoc = LlmDocChunk & {
  titleTokens: string[];
  tagTokens: string[];
  contentTokens: string[];
};

type SearchResult = {
  doc: IndexedDoc;
  score: number;
};

type LexicalIndex = {
  docs: IndexedDoc[];
  titleIndex: Map<string, Map<number, number>>;
  tagIndex: Map<string, Map<number, number>>;
  contentIndex: Map<string, Map<number, number>>;
  avgTitleLen: number;
  avgTagLen: number;
  avgContentLen: number;
  totalDocs: number;
};

type SerializedPostingList = [string, Array<[number, number]>];

type SerializedLexicalIndex = {
  schemaVersion: 1;
  docs: IndexedDoc[];
  titleIndex: SerializedPostingList[];
  tagIndex: SerializedPostingList[];
  contentIndex: SerializedPostingList[];
  avgTitleLen: number;
  avgTagLen: number;
  avgContentLen: number;
  totalDocs: number;
};

type QueryOptions = {
  query: string;
  resourceType?: string;
  docKind?: DocKind;
  maxItems?: number;
};

type DocsResponse = {
  answer: string;
  references: {
    title: string;
    route: string;
    docKind: DocKind;
    sourcePath: string;
    headingPath: string[];
  }[];
  snippets?: {
    language: string;
    code: string;
    context?: string;
  }[];
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

const SYNONYM_MAP: Record<string, string[]> = {
  function: ['lambda', 'serverless', 'faas'],
  'web-service': ['container', 'docker', 'ecs', 'fargate', 'http-service'],
  'worker-service': ['background', 'worker', 'async-worker'],
  'private-service': ['internal-service', 'vpc-service'],
  'batch-job': ['batch', 'job', 'scheduled-job'],
  'multi-container-workload': ['multi-container', 'sidecar'],
  'nextjs-web': ['nextjs', 'next.js', 'next', 'ssr'],
  'astro-web': ['astro', 'astro.js'],
  'nuxt-web': ['nuxt', 'nuxt.js'],
  'sveltekit-web': ['sveltekit', 'svelte'],
  'solidstart-web': ['solidstart', 'solid'],
  'tanstack-web': ['tanstack', 'tanstack-start'],
  'remix-web': ['remix'],
  'relational-database': ['rds', 'postgres', 'postgresql', 'mysql', 'database', 'db', 'sql', 'aurora'],
  'dynamo-db-table': ['dynamodb', 'nosql', 'document-db'],
  'redis-cluster': ['elasticache', 'redis', 'cache'],
  bucket: ['s3', 'storage', 'object-storage'],
  'hosting-bucket': ['static-site', 'static-website', 'spa'],
  'http-api-gateway': ['api-gateway', 'apigateway', 'gateway', 'api'],
  'application-load-balancer': ['alb', 'load-balancer'],
  'network-load-balancer': ['nlb'],
  cdn: ['cloudfront', 'distribution'],
  'user-auth-pool': ['cognito', 'auth', 'authentication'],
  'event-bus': ['eventbridge', 'events'],
  'sns-topic': ['sns', 'notification', 'pubsub'],
  'sqs-queue': ['sqs', 'queue', 'message-queue'],
  'state-machine': ['step-functions', 'stepfunctions', 'workflow'],
  'efs-filesystem': ['efs', 'filesystem', 'persistent-storage'],
  bastion: ['jump-host', 'ssh'],
  'web-app-firewall': ['waf', 'firewall'],
  'mongo-db-atlas-cluster': ['mongodb', 'mongo'],
  'upstash-redis': ['upstash'],
  'open-search-domain': ['opensearch', 'elasticsearch', 'elastic'],
  'custom-resource': ['cloudformation-custom'],
  'deployment-script': ['deploy-script', 'migration-script'],
  'kinesis-stream': ['kinesis', 'streaming'],
  'aws-cdk-construct': ['cdk', 'construct']
};

const expandIdentifierWords = (text: string): string =>
  text.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-z0-9])([A-Z])/g, '$1 $2');

const tokenize = (text: string): string[] =>
  `${text} ${expandIdentifierWords(text)}`
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

// ─── BM25 Parameters ─────────────────────────────────────────────────────────

const K1 = 1.2;
const B = 0.75;

const FIELD_BOOSTS = {
  title: 10,
  tags: 8,
  content: 1
};

const REFERENCE_INTENT_TERMS = new Set([
  'allowed',
  'argument',
  'arguments',
  'default',
  'enum',
  'field',
  'fields',
  'interface',
  'option',
  'options',
  'parameter',
  'parameters',
  'property',
  'properties',
  'prop',
  'props',
  'reference',
  'required',
  'schema',
  'syntax',
  'type',
  'types',
  'typescript',
  'value',
  'values',
  'yaml'
]);

const WORKFLOW_INTENT_TERMS = new Set([
  'build',
  'connect',
  'create',
  'debug',
  'deploy',
  'diagnose',
  'example',
  'fix',
  'guide',
  'how',
  'inspect',
  'log',
  'logs',
  'migrate',
  'query',
  'run',
  'setup',
  'start',
  'troubleshoot',
  'use',
  'view',
  'using'
]);

const CLI_INTENT_TERMS = new Set(['cli', 'command', 'commands', 'flag', 'flags', 'option', 'options']);

const OBSERVABILITY_INTENT_TERMS = new Set(['alarm', 'alarms', 'debug', 'inspect', 'log', 'logs', 'metric', 'metrics']);

const CONNECTION_INTENT_TERMS = new Set([
  'connect',
  'connecting',
  'connection',
  'connections',
  'connectto',
  'environment',
  'variable',
  'variables'
]);

const PREVIEW_INTENT_TERMS = new Set(['preview', 'changes', 'diff']);
const SQL_DEBUG_INTENT_TERMS = new Set([
  'sql',
  'query',
  'queries',
  'querying',
  'select',
  'row',
  'rows',
  'rds',
  'database',
  'databases',
  'db',
  'postgres',
  'postgresql',
  'mysql'
]);
const SQL_DEBUG_DATABASE_TERMS = new Set([
  'sql',
  'rds',
  'database',
  'databases',
  'db',
  'postgres',
  'postgresql',
  'mysql'
]);
const SQL_DEBUG_QUERY_TERMS = new Set(['query', 'queries', 'querying', 'select', 'row', 'rows', 'check']);
const SQL_DEBUG_CLI_TERMS = new Set(['cli', 'command', 'line', 'terminal', 'shell', 'psql']);
const DYNAMODB_DEBUG_TERMS = new Set(['dynamodb', 'dynamo-db', 'dynamo', 'ddb']);
const SCHEDULE_TRIGGER_INTENT_TERMS = new Set(['cron', 'schedule', 'scheduled', 'timer']);
const STREAM_TRIGGER_INTENT_TERMS = new Set(['stream', 'streams', 'dynamodb']);

// ─── Lexical Index ───────────────────────────────────────────────────────────

const LEXICAL_INDEX_FILE_NAME = 'lexical-index.json';

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

const resolveLlmDocsFolderPath = async (): Promise<string> => {
  const envPath = process.env.STACKTAPE_LLM_DOCS_PATH;
  const argvPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
  const execPath = process.execPath ? resolve(process.execPath) : undefined;

  const candidates = [
    envPath,
    LLM_DOCS_FOLDER_PATH,
    argvPath ? join(dirname(argvPath), 'llm-docs') : undefined,
    argvPath ? join(dirname(argvPath), '..', 'llm-docs') : undefined,
    execPath ? join(dirname(execPath), 'llm-docs') : undefined,
    execPath ? join(dirname(execPath), '..', 'llm-docs') : undefined
  ].filter(Boolean) as string[];

  for (const candidatePath of candidates) {
    if (await pathExists(join(candidatePath, 'chunks', 'chunks.jsonl'))) {
      return candidatePath;
    }
  }

  throw new Error(
    `LLM docs not found. Run 'bun run gen:llm-docs' before starting MCP. Checked: ${candidates.join(', ')}`
  );
};

const parseChunks = (content: string): LlmDocChunk[] =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LlmDocChunk);

const buildIndexFromChunks = (chunksContent: string): LexicalIndex => {
  const docs: IndexedDoc[] = parseChunks(chunksContent).map((entry) => ({
    ...entry,
    titleTokens: tokenize([...entry.headingPath, entry.title, entry.route].join(' ')),
    tagTokens: [...entry.tags, entry.resourceType, ...entry.definitionNames]
      .filter((value): value is string => Boolean(value))
      .flatMap((tag) => tokenize(tag)),
    contentTokens: tokenize(entry.content)
  }));

  const titleIndex = buildInvertedIndex(docs, 'titleTokens');
  const tagIndex = buildInvertedIndex(docs, 'tagTokens');
  const contentIndex = buildInvertedIndex(docs, 'contentTokens');

  const avgTitleLen = docs.reduce((sum, doc) => sum + doc.titleTokens.length, 0) / docs.length;
  const avgTagLen = docs.reduce((sum, doc) => sum + doc.tagTokens.length, 0) / docs.length;
  const avgContentLen = docs.reduce((sum, doc) => sum + doc.contentTokens.length, 0) / docs.length;

  return {
    docs,
    titleIndex,
    tagIndex,
    contentIndex,
    avgTitleLen,
    avgTagLen,
    avgContentLen,
    totalDocs: docs.length
  };
};

const serializeInvertedIndex = (index: Map<string, Map<number, number>>): SerializedPostingList[] =>
  [...index.entries()].map(([term, postings]) => [term, [...postings.entries()]]);

const deserializeInvertedIndex = (index: SerializedPostingList[]): Map<string, Map<number, number>> =>
  new Map(index.map(([term, postings]) => [term, new Map(postings)]));

const serializeLexicalIndex = (index: LexicalIndex): SerializedLexicalIndex => ({
  schemaVersion: 1,
  docs: index.docs,
  titleIndex: serializeInvertedIndex(index.titleIndex),
  tagIndex: serializeInvertedIndex(index.tagIndex),
  contentIndex: serializeInvertedIndex(index.contentIndex),
  avgTitleLen: index.avgTitleLen,
  avgTagLen: index.avgTagLen,
  avgContentLen: index.avgContentLen,
  totalDocs: index.totalDocs
});

const deserializeLexicalIndex = (serialized: SerializedLexicalIndex): LexicalIndex => {
  if (serialized.schemaVersion !== 1) {
    throw new Error(`Unsupported lexical index schema version: ${serialized.schemaVersion}`);
  }

  return {
    docs: serialized.docs,
    titleIndex: deserializeInvertedIndex(serialized.titleIndex),
    tagIndex: deserializeInvertedIndex(serialized.tagIndex),
    contentIndex: deserializeInvertedIndex(serialized.contentIndex),
    avgTitleLen: serialized.avgTitleLen,
    avgTagLen: serialized.avgTagLen,
    avgContentLen: serialized.avgContentLen,
    totalDocs: serialized.totalDocs
  };
};

const buildIndex = async (): Promise<LexicalIndex> => {
  const llmDocsFolderPath = await resolveLlmDocsFolderPath();
  const lexicalIndexPath = join(llmDocsFolderPath, LEXICAL_INDEX_FILE_NAME);

  if (await pathExists(lexicalIndexPath)) {
    return deserializeLexicalIndex(JSON.parse(await readFile(lexicalIndexPath, 'utf-8')) as SerializedLexicalIndex);
  }

  const chunksContent = await readFile(join(llmDocsFolderPath, 'chunks', 'chunks.jsonl'), 'utf-8');
  return buildIndexFromChunks(chunksContent);
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

const expandQuery = (tokens: string[], synonymMap: Record<string, string[]>): string[] => {
  const expanded = new Set(tokens);
  const reverseSynonyms = new Map<string, string[]>();

  for (const [key, synonyms] of Object.entries(synonymMap)) {
    for (const synonym of synonyms) {
      const synonymTokens = tokenize(synonym);
      for (const token of synonymTokens) {
        if (!reverseSynonyms.has(token)) reverseSynonyms.set(token, []);
        reverseSynonyms.get(token)!.push(key, ...synonyms);
      }
    }
    for (const token of tokenize(key)) {
      if (!reverseSynonyms.has(token)) reverseSynonyms.set(token, []);
      reverseSynonyms.get(token)!.push(...synonyms);
    }
  }

  for (const token of tokens) {
    const related = reverseSynonyms.get(token);
    if (!related) continue;
    for (const relatedValue of related) {
      for (const relatedToken of tokenize(relatedValue)) expanded.add(relatedToken);
    }
  }

  return Array.from(expanded);
};

const inferQueryIntent = (rawTokens: string[]): 'reference' | 'workflow' | undefined => {
  const referenceMatches = rawTokens.filter((token) => REFERENCE_INTENT_TERMS.has(token)).length;
  const workflowMatches = rawTokens.filter((token) => WORKFLOW_INTENT_TERMS.has(token)).length;

  if (referenceMatches === 0 && workflowMatches === 0) return undefined;
  return referenceMatches > workflowMatches ? 'reference' : 'workflow';
};

const getChunkGroupKey = (doc: IndexedDoc): string => doc.headingPath.slice(0, 2).join('>');

const diversifyResults = (results: SearchResult[], maxItems: number): SearchResult[] => {
  const selected: SearchResult[] = [];
  const selectedPageIds = new Set<string>();
  const selectedRoutes = new Set<string>();
  const selectedChunkGroups = new Set<string>();

  const add = (result: SearchResult, requireNewPage: boolean, requireNewRoute: boolean) => {
    if (selected.length >= maxItems) return;
    const chunkGroupKey = `${result.doc.pageId}:${getChunkGroupKey(result.doc)}`;
    if (selectedChunkGroups.has(chunkGroupKey)) return;
    if (requireNewPage && selectedPageIds.has(result.doc.pageId)) return;
    if (requireNewRoute && selectedRoutes.has(result.doc.route)) return;

    selected.push(result);
    selectedPageIds.add(result.doc.pageId);
    selectedRoutes.add(result.doc.route);
    selectedChunkGroups.add(chunkGroupKey);
  };

  // Definition-level API pages intentionally share a stable route (for example, all Lambda
  // definitions use /config-reference/function). Prefer distinct routes first so one resource
  // family cannot crowd workflow results, then relax to distinct pages and finally chunks.
  for (const result of results) add(result, true, true);
  for (const result of results) add(result, true, false);
  for (const result of results) add(result, false, false);
  for (const result of results) {
    if (selected.length >= maxItems) break;
    if (!selected.some((selectedResult) => selectedResult.doc.id === result.doc.id)) selected.push(result);
  }

  return selected;
};

const search = (index: LexicalIndex, options: QueryOptions): SearchResult[] => {
  const { query, resourceType, docKind, maxItems = 3 } = options;

  const normalizedQuery = query.toLowerCase();
  const rawTokens = tokenize(query);
  if (rawTokens.length === 0) return [];
  if (resourceType && !index.docs.some((doc) => doc.resourceType === resourceType)) return [];

  const queryTokens = expandQuery(rawTokens, SYNONYM_MAP);
  const intent = inferQueryIntent(rawTokens);
  const hasCliIntent = rawTokens.some((token) => CLI_INTENT_TERMS.has(token));
  const hasObservabilityIntent = rawTokens.some((token) => OBSERVABILITY_INTENT_TERMS.has(token));
  const hasConnectionIntent = rawTokens.some((token) => CONNECTION_INTENT_TERMS.has(token));
  const hasPreviewIntent = rawTokens.some((token) => PREVIEW_INTENT_TERMS.has(token));
  const hasSqlDebugIntent =
    (rawTokens.includes('debug') && rawTokens.some((token) => SQL_DEBUG_INTENT_TERMS.has(token))) ||
    (rawTokens.some((token) => SQL_DEBUG_DATABASE_TERMS.has(token)) &&
      rawTokens.some((token) => SQL_DEBUG_QUERY_TERMS.has(token))) ||
    (rawTokens.some((token) => SQL_DEBUG_DATABASE_TERMS.has(token)) &&
      rawTokens.some((token) => SQL_DEBUG_CLI_TERMS.has(token))) ||
    /check (?:a )?rows?/.test(normalizedQuery) ||
    /select\s+\*/.test(normalizedQuery) ||
    /(?:query|queries|querying|select).*(?:postgres|postgresql|mysql|rds|database|db)/.test(normalizedQuery) ||
    /(?:postgres|postgresql|mysql|rds|database|db).*(?:query|queries|querying|select)/.test(normalizedQuery);
  const hasDynamoDbCliQueryIntent =
    rawTokens.some((token) => DYNAMODB_DEBUG_TERMS.has(token)) &&
    rawTokens.some((token) => token === 'query' || token === 'queries' || token === 'querying') &&
    (hasCliIntent || rawTokens.some((token) => SQL_DEBUG_CLI_TERMS.has(token)));
  const hasScheduleTriggerIntent = rawTokens.some((token) => SCHEDULE_TRIGGER_INTENT_TERMS.has(token));
  const hasStreamTriggerIntent =
    rawTokens.some((token) => STREAM_TRIGGER_INTENT_TERMS.has(token)) &&
    rawTokens.some(
      (token) =>
        token === 'trigger' ||
        token === 'triggers' ||
        token === 'lambda' ||
        token === 'function' ||
        token === 'integration' ||
        token === 'streamarn'
    );
  const hasDynamoDbIntegrationIntent =
    rawTokens.includes('dynamodbintegration') ||
    (rawTokens.includes('dynamo') && rawTokens.includes('db') && rawTokens.includes('integration'));
  const hasJoinDefaultVpcIntent = rawTokens.includes('joindefaultvpc');
  const scores = new Float64Array(index.totalDocs);

  for (let docIdx = 0; docIdx < index.totalDocs; docIdx++) {
    const doc = index.docs[docIdx];

    if (docKind && doc.docKind !== docKind) continue;
    if (resourceType && docKind === 'config-reference' && doc.resourceType !== resourceType) continue;

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

    if (doc.resourceType && rawTokens.includes(doc.resourceType)) {
      score *= 1.3;
    }

    if (resourceType && doc.resourceType === resourceType) {
      score *= 1.4;
    } else if (resourceType && doc.docKind === 'config-reference') {
      score *= 0.65;
    }

    if (doc.resourceType && queryTokens.some((token) => doc.tagTokens.includes(token))) {
      score *= 1.15;
    }

    if (intent === 'reference') {
      score *= doc.docKind === 'config-reference' ? 1.7 : 0.75;
    } else if (intent === 'workflow') {
      score *= doc.docKind === 'docs-page' ? 1.2 : 0.85;
    }

    if (hasCliIntent && doc.route.startsWith('/cli/')) {
      score *= 1.25;
    }

    if (
      hasObservabilityIntent &&
      (doc.route.startsWith('/observability/') ||
        doc.route.startsWith('/local-development/debug') ||
        doc.route.startsWith('/cli/debug-') ||
        ['/cli/logs', '/cli/metrics', '/cli/alarms'].includes(doc.route))
    ) {
      score *= 1.25;
    }

    if (hasConnectionIntent && doc.route === '/configuration/connecting-resources') {
      score *= 4;
    }

    if (hasConnectionIntent && doc.route === '/configuration/referenceable-parameters') {
      score *= 1.35;
    }

    if (hasPreviewIntent && (doc.route === '/cli/diff' || doc.route === '/cli/preview-changes')) {
      score *= 4;
    }

    if (hasPreviewIntent && doc.route === '/deployment-and-lifecycle/previewing-changes') {
      score *= 1.6;
    }

    if (hasPreviewIntent && doc.route === '/cli/deploy') {
      score *= 0.7;
    }

    if (hasSqlDebugIntent && (doc.route === '/cli/query-sql' || doc.route === '/cli/debug-sql')) {
      score *= 6;
    }

    if (hasSqlDebugIntent && (doc.route === '/cli/bastion-tunnel' || doc.route === '/cli/param-get')) {
      score *= 0.45;
    }

    if (hasDynamoDbCliQueryIntent && (doc.route === '/cli/query-dynamodb' || doc.route === '/cli/debug-dynamodb')) {
      score *= 8;
    }

    if (hasDynamoDbCliQueryIntent && doc.route === '/resources/databases/dynamodb') {
      score *= 2.2;
    }

    if (hasDynamoDbCliQueryIntent && (doc.route === '/cli/query-sql' || doc.route === '/cli/debug-sql')) {
      score *= 0.35;
    }

    if (hasScheduleTriggerIntent && doc.route === '/configuration/triggers/schedule-triggers') {
      score *= 2.1;
    }

    if (hasStreamTriggerIntent && doc.route === '/resources/triggers/dynamodb-streams') {
      score *= 2.4;
    }

    if (hasDynamoDbIntegrationIntent && doc.route === '/resources/triggers/dynamodb-streams') {
      score *= 4;
    }

    if (hasJoinDefaultVpcIntent) {
      score *= doc.content.includes('joinDefaultVpc') ? 2.4 : 0.45;
    }

    scores[docIdx] = score;
  }

  const results: SearchResult[] = [];
  for (let i = 0; i < index.totalDocs; i++) {
    if (scores[i] > 0) {
      results.push({ doc: index.docs[i], score: scores[i] });
    }
  }
  results.sort((a, b) => b.score - a.score);

  if (results.length > 1) {
    const topScore = results[0].score;
    return diversifyResults(
      results.filter((result) => result.score >= topScore * 0.25),
      maxItems
    );
  }

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

const truncateSnippetCode = (code: string, maxChars = 1800): string =>
  code.length <= maxChars ? code : `${code.slice(0, maxChars).trimEnd()}\n... [snippet truncated]`;

const formatAnswer = (results: SearchResult[], mode: 'answer' | 'reference' | 'snippet'): DocsResponse => {
  if (results.length === 0) {
    return {
      answer: 'No relevant documentation found for this query.',
      references: []
    };
  }

  const references = results.map((result) => ({
    title: result.doc.title,
    route: result.doc.route,
    docKind: result.doc.docKind,
    sourcePath: result.doc.sourcePath,
    headingPath: result.doc.headingPath
  }));

  if (mode === 'reference') {
    return {
      answer: `Found ${results.length} relevant document(s).`,
      references
    };
  }

  if (mode === 'snippet') {
    const snippets: { language: string; code: string; context?: string }[] = [];
    for (const result of results) {
      const blocks = extractCodeBlocks(result.doc.content);
      if (blocks.length > 0) {
        snippets.push({
          ...blocks[0],
          code: truncateSnippetCode(blocks[0].code),
          context: truncateSnippetCode(result.doc.content.trim(), 2200)
        });
      } else {
        snippets.push({
          language: 'markdown',
          code: truncateSnippetCode(result.doc.content.trim(), 1200)
        });
      }
    }
    return {
      answer: `Found ${snippets.length} snippet(s).`,
      references,
      snippets
    };
  }

  const MAX_CONTENT_CHARS = 12000;
  let totalChars = 0;
  const answerParts: string[] = [];

  for (const result of results) {
    const remaining = MAX_CONTENT_CHARS - totalChars;
    if (remaining <= 0) break;

    const heading = result.doc.headingPath.join(' > ');
    const content = result.doc.content.slice(0, remaining);
    answerParts.push(`## ${heading}\n\nSource: ${result.doc.sourcePath}\nRoute: ${result.doc.route}\n\n${content}`);
    totalChars += content.length;
  }

  return {
    answer: answerParts.join('\n\n---\n\n'),
    references,
    snippets: extractCodeBlocks(results[0].doc.content).slice(0, 2) || undefined
  };
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export type { DocKind, DocsResponse, IndexedDoc, LexicalIndex, QueryOptions, SearchResult, SerializedLexicalIndex };
export {
  buildIndex,
  buildIndexFromChunks,
  expandQuery,
  formatAnswer,
  LEXICAL_INDEX_FILE_NAME,
  search,
  serializeLexicalIndex,
  tokenize
};
