import resources from '../../../.resources.json';
import { marked } from '../../../scripts/utils/marked-mdx-parser';
import { Link } from './Link';

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
        <Link href="/configuration/directives/#resource-param">$ResourceParam directive</Link> directive.
      </p>
      <p>
        To learn more about referencing parameters, refer to{' '}
        <Link href="/configuration/referencing-parameters/">referencing parameters</Link>.
      </p>
      {Object.entries(referenceableParams).map(([paramName, description]) => {
        return (
          <div key={paramName} className="mt-[18px] stp-typography">
            <span className="font-bold">{paramName}</span>
            <ul>
              <li className="[&_a]:font-bold" dangerouslySetInnerHTML={{ __html: marked(description) }} />
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
