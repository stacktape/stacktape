// Canonical resource metadata, alongside the MDX corpus. See AGENTS.md.
import resources from '../../../.resources.json';
import { renderDocsMarkdown } from '@/utils/docs-markdown';

const normalizeLegacyDocLinks = (description: string) =>
  description
    .replaceAll('(#custom-domain-names)', '(/resources/networking/custom-domains/)')
    .replaceAll('(#cdn)', '(/resources/networking/cdn/)')
    .replaceAll('/compute-resources/web-services/', '/resources/compute/web-service/')
    .replaceAll('/compute-resources/multi-container-workloads/', '/resources/compute/multi-container-workload/')
    .replaceAll('/resources/dynamo-db-tables/#item-change-streaming', '/resources/databases/dynamodb/#streams');

export function ReferenceableParams({ resource, resourceType }: { resource?: string; resourceType?: string }) {
  const resolvedResource = resource || resourceType;
  const params = resources.find((r) => r.resourceType === resolvedResource);

  const referenceableParams = params?.referenceableParams;

  if (!resolvedResource || !referenceableParams) {
    console.error(`No referenceable params found for ${resolvedResource || 'unknown resource'}`);
    return null;
  }

  return (
    <>
      <p>
        Reference these parameters with the{' '}
        <a href="/configuration/directives/#resourceparam">
          <code>$ResourceParam</code>
        </a>{' '}
        directive: <code>{`$ResourceParam('<resource-name>', '<parameter>')`}</code>. See{' '}
        <a href="/configuration/referenceable-parameters/">referenceable parameters</a>.
      </p>
      <dl className="docs-defs">
        {Object.entries(referenceableParams).map(([paramName, description]) => (
          <div key={paramName} className="docs-def">
            <dt>
              <code>{paramName}</code>
            </dt>
            <dd dangerouslySetInnerHTML={{ __html: renderDocsMarkdown(normalizeLegacyDocLinks(description)) }} />
          </div>
        ))}
      </dl>
    </>
  );
}
