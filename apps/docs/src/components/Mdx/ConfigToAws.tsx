import type { ReactNode } from 'react';

// A config next to the AWS resources it creates. Hovering a config line highlights what it creates, and the other
// way round. The link is pure CSS (`:has()`), so the component stays static like the rest of the landing page.
//
// The resource list follows the resolvers: packages/config-authoring/src/child-resources.ts (function, http-api-gateway,
// dynamo-db-table) and the HTTP API integration in
// apps/cli/src/domain/calculated-stack-overview-manager/resource-resolvers/functions/events/http-api-gateway/index.ts.

type Key = 'table' | 'api' | 'fn' | 'role' | 'route';
type TokenKind = 'k' | 'c' | 'f' | 's' | 'p' | 'x';
type Line = { key?: Key; tokens: Array<[string, TokenKind]> };

// Catppuccin Mocha, the theme of the site's code blocks (SHIKI_THEME in CodeBlockNew.tsx).
const tokenColor: Record<TokenKind, string> = {
  k: '#cba6f7',
  c: '#f9e2af',
  f: '#89b4fa',
  s: '#a6e3a1',
  p: '#cdd6f4',
  x: '#9399b2'
};

const t = (text: string, kind: TokenKind = 'p'): [string, TokenKind] => [text, kind];

const LINES: Line[] = [
  { tokens: [t('import', 'k'), t(' { defineConfig, DynamoDbTable, HttpApiGateway,')] },
  { tokens: [t('  HttpApiIntegration, JsBundleLambdaPackaging, LambdaFunction')] },
  { tokens: [t('}', 'p'), t(' from', 'k'), t(" 'stacktape'", 's'), t(';', 'x')] },
  { tokens: [] },
  { tokens: [t('export default', 'k'), t(' defineConfig', 'f'), t('(() => {', 'x')] },
  {
    key: 'table',
    tokens: [t('  const', 'k'), t(' database = '), t('new', 'k'), t(' DynamoDbTable', 'c'), t('({', 'x')]
  },
  {
    key: 'table',
    tokens: [
      t('    primaryKey: { partitionKey: { name: '),
      t("'id'", 's'),
      t(', type: '),
      t("'string'", 's'),
      t(' } }')
    ]
  },
  { key: 'table', tokens: [t('  });', 'x')] },
  { tokens: [] },
  {
    key: 'api',
    tokens: [
      t('  const', 'k'),
      t(' api = '),
      t('new', 'k'),
      t(' HttpApiGateway', 'c'),
      t('({ cors: { enabled: '),
      t('true', 'k'),
      t(' } });', 'x')
    ]
  },
  { tokens: [] },
  { key: 'fn', tokens: [t('  const', 'k'), t(' handler = '), t('new', 'k'), t(' LambdaFunction', 'c'), t('({', 'x')] },
  { key: 'fn', tokens: [t('    packaging: '), t('new', 'k'), t(' JsBundleLambdaPackaging', 'c'), t('({', 'x')] },
  { key: 'fn', tokens: [t('      entryfilePath: '), t("'./src/index.ts'", 's')] },
  { key: 'fn', tokens: [t('    }),', 'x')] },
  { key: 'route', tokens: [t('    events: [', 'p'), t('new', 'k'), t(' HttpApiIntegration', 'c'), t('({', 'x')] },
  {
    key: 'route',
    tokens: [t('      httpApiGatewayName: api, method: '), t("'GET'", 's'), t(', path: '), t("'/'", 's')]
  },
  { key: 'route', tokens: [t('    })],', 'x')] },
  { key: 'role', tokens: [t('    connectTo: [database],')] },
  { key: 'fn', tokens: [t('    environment: { TABLE_NAME: database.name }')] },
  { key: 'fn', tokens: [t('  });', 'x')] },
  { tokens: [] },
  { tokens: [t('  return', 'k'), t(' { resources: { database, api, handler } };')] },
  { tokens: [t('});', 'x')] }
];

// Stable keys for rendering; the source order of lines and tokens never changes.
const RENDERED_LINES = LINES.map((line, lineNumber) => ({
  id: `line-${lineNumber}`,
  key: line.key,
  tokens: line.tokens.map(([text, kind], position) => ({ id: `${lineNumber}-${position}`, text, kind }))
}));

type Category = 'compute' | 'database' | 'network' | 'security';
type AwsRow = { key: Key; name: string; type: string; category: Category };
type AwsGroup = { resource: string; kind: string; rows: AwsRow[] };

const GROUPS: AwsGroup[] = [
  {
    resource: 'database',
    kind: 'DynamoDbTable',
    rows: [{ key: 'table', name: 'DynamoDB table', type: 'AWS::DynamoDB::GlobalTable', category: 'database' }]
  },
  {
    resource: 'api',
    kind: 'HttpApiGateway',
    rows: [
      { key: 'api', name: 'HTTP API', type: 'AWS::ApiGatewayV2::Api', category: 'network' },
      { key: 'api', name: 'API stage', type: 'AWS::ApiGatewayV2::Stage', category: 'network' }
    ]
  },
  {
    resource: 'handler',
    kind: 'LambdaFunction',
    rows: [
      { key: 'fn', name: 'Lambda function', type: 'AWS::Lambda::Function', category: 'compute' },
      { key: 'fn', name: 'Log group', type: 'AWS::Logs::LogGroup', category: 'compute' },
      { key: 'role', name: 'IAM role with access to the table', type: 'AWS::IAM::Role', category: 'security' },
      { key: 'route', name: 'Route GET /', type: 'AWS::ApiGatewayV2::Route', category: 'network' },
      { key: 'route', name: 'API integration', type: 'AWS::ApiGatewayV2::Integration', category: 'network' },
      { key: 'route', name: 'Invoke permission for the API', type: 'AWS::Lambda::Permission', category: 'security' }
    ]
  }
];

const categoryDot: Record<Category, string> = {
  compute: 'bg-aws-compute',
  database: 'bg-aws-database',
  network: 'bg-aws-network',
  security: 'bg-aws-security'
};

const KEYS: Key[] = ['table', 'api', 'fn', 'role', 'route'];

// One pair of rules per key: hovering either side lights up both sides of that key and dims the rest.
const LINK_CSS = [
  '.stp-c2a:has([data-k]:hover) [data-k]{opacity:.4}',
  ...KEYS.map(
    (key) => `.stp-c2a:has([data-k="${key}"]:hover) [data-k="${key}"]{opacity:1;background:rgba(54,190,190,.12)}`
  ),
  '@media (prefers-reduced-motion:no-preference){.stp-c2a [data-k]{transition:opacity 160ms ease,background-color 160ms ease}}',
  '@media (hover:none){.stp-c2a-hint{display:none}}'
].join('');

export function ConfigToAws({ children }: { children?: ReactNode }) {
  const rowCount = GROUPS.reduce((total, group) => total + group.rows.length, 0);
  return (
    <figure className="stp-c2a font-sans stp-box my-6 overflow-hidden p-0">
      <style dangerouslySetInnerHTML={{ __html: LINK_CSS }} />
      <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] max-[1000px]:grid-cols-1">
        <div className="min-w-0 border-r border-border-light max-[1000px]:border-r-0 max-[1000px]:border-b">
          <div className="flex items-center justify-between px-4 py-[9px] border-b border-border-light">
            <span className="text-[0.78rem] font-semibold text-fc-primary font-mono">stacktape.ts</span>
            <span className="stp-c2a-hint text-[0.72rem] text-fc-ternary">Hover a line to see what it creates</span>
          </div>
          <pre className="stp-pretty-scrollbar m-0 overflow-x-auto py-3 font-mono text-[12.5px] leading-[1.62]">
            {RENDERED_LINES.map((line) => (
              <div key={line.id} data-k={line.key} className="px-4 min-h-[1.62em] whitespace-pre">
                {line.tokens.map((token) => (
                  <span key={token.id} style={{ color: tokenColor[token.kind] }}>
                    {token.text}
                  </span>
                ))}
              </div>
            ))}
          </pre>
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between px-4 py-[9px] border-b border-border-light">
            <span className="text-[0.78rem] font-semibold text-fc-primary">Created in your AWS account</span>
            <span className="text-[0.72rem] text-fc-ternary">{rowCount} resources</span>
          </div>
          <div className="py-2">
            {GROUPS.map((group) => (
              <div key={group.resource} className="px-2 pt-1 pb-[6px]">
                <div className="px-2 pt-1 pb-[3px] text-[0.72rem] text-fc-light">
                  <span className="font-mono text-fc-secondary">{group.resource}</span>
                  <span className="text-fc-ternary"> · {group.kind}</span>
                </div>
                {group.rows.map((row) => (
                  <div
                    key={row.type}
                    data-k={row.key}
                    className="flex items-baseline gap-[9px] rounded-md px-2 py-[4px]"
                  >
                    <span
                      className={`mt-[1px] h-[7px] w-[7px] shrink-0 self-center rounded-full ${categoryDot[row.category]}`}
                    />
                    <span className="min-w-0 flex-1 text-[0.84rem] leading-[1.35] text-fc-primary">{row.name}</span>
                    <span className="shrink-0 font-mono text-[0.68rem] text-fc-ternary max-[650px]:hidden">
                      {row.type}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {children && (
        <figcaption className="border-t border-border-light px-4 py-[10px] text-[0.82rem] leading-[1.55] text-fc-lighter [&_p]:m-0">
          {children}
        </figcaption>
      )}
    </figure>
  );
}
