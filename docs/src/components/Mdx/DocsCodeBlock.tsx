import { CodeBlockNew, MdxCodeBlockNew } from './CodeBlockNew';

type CodeTab = { label: string; lang: string; code: string };

/**
 * Single hydrated entry point for every code block. Two input shapes:
 *  - `tabs` (from explicit `<CodeBlock tabs={[...]}>` authoring) → CodeBlockNew directly.
 *  - `code` + `lang` (from fenced ``` blocks, decoded server-side from base64) → MdxCodeBlockNew,
 *    which builds tabs + optional auto TypeScript/YAML pairing exactly as the old `code` mapping did.
 */
export default function DocsCodeBlock({
  tabs,
  code,
  lang,
  intellisense,
  stacktapeConfig,
  typescript
}: {
  tabs?: CodeTab[];
  code?: string;
  lang?: string | null;
  intellisense?: boolean;
  stacktapeConfig?: boolean;
  typescript?: string;
}) {
  if (tabs && tabs.length > 0) {
    return <CodeBlockNew tabs={tabs} lang={lang ?? null} intellisense={intellisense} stacktapeConfig={stacktapeConfig} />;
  }

  return (
    <MdxCodeBlockNew
      className={lang ? `language-${lang}` : undefined}
      intellisense={intellisense}
      stacktapeConfig={stacktapeConfig}
      typescript={typescript}
    >
      {code ?? ''}
    </MdxCodeBlockNew>
  );
}
