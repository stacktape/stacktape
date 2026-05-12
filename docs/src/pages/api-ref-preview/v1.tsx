import { ApiReferenceV1 } from '@/components/Mdx/api-ref-variants/V1';
import { PreviewShell } from '@/components/api-ref-preview/PreviewShell';

export default function PreviewV1() {
  return (
    <PreviewShell
      active="v1"
      title="V1 — Tree nav + schema-as-code"
      blurb="Dual-pane: recursive tree nav on the left where union branches and nested type-properties references are first-class navigation children at every depth. Right pane focuses one thing at a time and renders the schema as TypeScript via the standard <CodeBlockNew /> for proper Shiki highlighting + chrome. Type names kept verbatim (PascalCase)."
      render={(definitionName) => <ApiReferenceV1 definitionName={definitionName} />}
    />
  );
}
