import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import type { ReactNode } from 'react';
import type { ConfigResources } from '../config-resources';
import { partName } from '../part-names';
import type { WizardState } from '../session';
import { splitMonthly } from '../steps/review-model';
import { groupedAccount } from './TargetFacts';

/** What people open and call first, then what runs behind it, then where data lives, then the rest. */
const RANK: Readonly<Record<string, number>> = {
  'hosting-bucket': 0,
  'web-service': 1,
  'http-api-gateway': 1,
  function: 2,
  'private-service': 2,
  'worker-service': 2,
  'multi-container-workload': 2,
  'batch-job': 2,
  'relational-database': 3,
  'mongo-db-atlas-cluster': 3,
  'dynamo-db-table': 3,
  'redis-cluster': 4,
  'upstash-redis': 4,
  bucket: 4
};
const rankOf = (type: string) => RANK[type] ?? (type.endsWith('-web') ? 0 : 5);

/** A resource's monthly price as the summary prints it: "$28/mo", "Usage", or nothing while it is unknown. */
const priceWords = (price: string | undefined): string | undefined => {
  if (price === undefined) return undefined;
  if (price === 'pay-per-use') return 'Usage';
  return price.startsWith('$') ? price : undefined;
};

/**
 * What the Deploy click commits to, as a short receipt: where (account, region, the stack), the parts it creates with
 * what each costs, the monthly total, and how long it takes. `action` is the Deploy button when the summary carries it.
 */
export function DeploySummary({
  state,
  resources,
  region,
  stackName,
  isUpdate,
  estimate,
  action,
  footnote
}: {
  state: WizardState;
  resources: ConfigResources;
  region: string;
  stackName: string;
  isUpdate: boolean;
  /** "10–15 min". */
  estimate: string;
  action?: ReactNode;
  /** Under the action: what is still missing, or what the click does. */
  footnote?: ReactNode;
}) {
  const identity = state.awsIdentity?.available === true ? state.awsIdentity : undefined;
  const services = (state.facts?.services ?? []) as ReadonlyArray<{
    name: string;
    framework?: string;
    language?: string;
  }>;
  const price = state.composition?.price;
  const monthly = price === undefined ? undefined : splitMonthly(price.monthly);
  const parts = Object.entries(resources).toSorted(([, left], [, right]) => rankOf(left.type) - rankOf(right.type));
  const account = identity === undefined ? undefined : (identity.accountAlias ?? groupedAccount(identity.accountId));
  // A release command runs in a one-off task of its own, which the deploy creates too.
  const released = parts.filter(([, resource]) => resource.properties.releaseCommand !== undefined);

  return (
    <section aria-label="Deploy summary" className="w-summary">
      <header className="w-summary-head">
        <p className="w-summary-eyebrow">{isUpdate ? 'Deploy updates' : 'Deploy creates'}</p>
        <p className="w-summary-stack">{stackName}</p>
        <p className="w-summary-where">
          {account !== undefined
            ? account
            : state.awsIdentity === undefined
              ? 'Checking the AWS account…'
              : 'No working AWS credentials yet'}
          <span aria-hidden> · </span>
          {region}
        </p>
      </header>

      <ul className="w-summary-parts">
        {parts.map(([name, resource]) => {
          const cost = priceWords(price?.byResource[name]);
          return (
            <li key={name}>
              <ResourceIcon resourceType={resource.type} size={20} />
              <span className="w-summary-part">
                <span className="w-summary-part-name">{name}</span>
                <span className="w-summary-part-kind">{partName(name, resource, services)}</span>
              </span>
              <span className={`w-summary-part-price${cost === 'Usage' ? ' is-usage' : ''}`}>{cost ?? ''}</span>
            </li>
          );
        })}
        {released.map(([name]) => (
          <li key={`${name}-release`}>
            <ResourceIcon resourceType="worker-service" size={20} />
            <span className="w-summary-part">
              <span className="w-summary-part-name">{name} release task</span>
              <span className="w-summary-part-kind">runs the migration before each deploy</span>
            </span>
            <span className="w-summary-part-price is-usage">Per run</span>
          </li>
        ))}
      </ul>

      <dl className="w-summary-totals">
        <div>
          <dt>Estimated</dt>
          <dd>
            {monthly?.amount === undefined ? (
              <span className="w-summary-pending">
                {state.composition?.priceUnavailable ? 'Not available' : 'Pricing…'}
              </span>
            ) : (
              <>
                <strong>{monthly.amount}</strong>/month{monthly.usage ? ' + usage' : ''}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Takes about</dt>
          <dd>{estimate}</dd>
        </div>
      </dl>

      {action !== undefined && <div className="w-summary-action">{action}</div>}
      {footnote !== undefined && <div className="w-summary-foot">{footnote}</div>}
    </section>
  );
}
