import { typographyCss } from '@/styles/global';
import resources from '../../../.resources.json';
import { marked } from '../../../scripts/utils/marked-mdx-parser';
import { Link } from './Link';

export function ReferenceableParams({ resource }: { resource: string }) {
  const params = resources.find((r) => r.resourceType === resource);

  const referenceableParams = params?.referenceableParams;

  if (!referenceableParams) {
    console.error(`No referenceable params found for ${resource}`);
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
          <div key={paramName} css={{ marginTop: '18px', ...typographyCss }}>
            <span css={{ fontWeight: 'bold' }}>{paramName}</span>
            <ul>
              <li
                css={{
                  a: {
                    fontWeight: 'bold'
                  }
                }}
                dangerouslySetInnerHTML={{ __html: marked(description) }}
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
