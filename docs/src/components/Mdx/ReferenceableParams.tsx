import resources from '../../../.resources.json';
import { marked } from '../../../scripts/utils/marked-mdx-parser';
import { Link } from './Link';

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
    <div>
      <p>
        The following parameters can be easily referenced using{' '}
        <Link href="/configuration/directives/#resourceparam">$ResourceParam directive</Link> directive.
      </p>
      <p>
        To learn more about referencing parameters, refer to{' '}
        <Link href="/configuration/referenceable-parameters/">referencing parameters</Link>.
      </p>
      {Object.entries(referenceableParams).map(([paramName, description]) => {
        return (
          <div key={paramName} className="mt-[18px] stp-typography">
            <span className="font-bold">{paramName}</span>
            <ul>
              <li
                className="[&_a]:font-bold"
                dangerouslySetInnerHTML={{ __html: marked(normalizeLegacyDocLinks(description)) }}
              />
              <li>
                Usage: <code>{`$ResourceParam('<<resource-name>>', '${paramName}')`}</code>
              </li>
            </ul>
          </div>
        );
      })}
    </div>
  );
}
