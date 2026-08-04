import type { AnonymousTrpcClient } from './anonymous.js';
import type { ApiKeyTrpcClient } from './api-key.js';
import type { AwsIdentityTrpcClient } from './aws-identity.js';

/**
 * Each authenticated surface is a separate client type, so a client typed for one of them cannot even name
 * a procedure from another. These assertions fail the build if the three surfaces ever start to overlap.
 */

declare const anonymous: AnonymousTrpcClient;
declare const apiKey: ApiKeyTrpcClient;
declare const awsIdentity: AwsIdentityTrpcClient;

void anonymous.exchangeTokenForApiKey;
// @ts-expect-error Anonymous clients must not see API-key procedures.
void anonymous.currentUserAndOrgData;
// @ts-expect-error Anonymous clients must not see AWS-identity procedures.
void anonymous.reportAlarmEvent;
// @ts-expect-error Anonymous clients must not see private Console session procedures.
void anonymous.currentUser;

void apiKey.currentUserAndOrgData;
// @ts-expect-error API-key clients must not see AWS-identity procedures.
void apiKey.reportAlarmEvent;
// @ts-expect-error API-key clients must not see anonymous token exchange.
void apiKey.exchangeTokenForApiKey;
// @ts-expect-error API-key clients must not see private Console session procedures.
void apiKey.currentUser;

void awsIdentity.reportAlarmEvent;
// @ts-expect-error AWS-identity clients must not see API-key procedures.
void awsIdentity.currentUserAndOrgData;
// @ts-expect-error AWS-identity clients must not see anonymous procedures.
void awsIdentity.stackPriceEstimation;

/**
 * The contract is deliberately free of database structure. `keyof` on a published response would name the
 * columns if a Prisma payload ever leaked into it, so the checks below pin the two shapes that are closest
 * to the database.
 */
type OrganizationSummaryKeys = keyof import('./api-key.js').OrganizationSummary;
type ExpectedOrganizationSummaryKeys =
  | 'id'
  | 'name'
  | 'role'
  | 'isPersonal'
  | 'createdAt'
  | 'connectedAccountsCount'
  | 'isCurrent';

type Assert<Condition extends true> = Condition;

/** Both unions contain exactly the same members — an extra key on either side resolves to `false`. */
type SameKeys<Actual, Expected> = [Actual] extends [Expected] ? ([Expected] extends [Actual] ? true : false) : false;

export type OrganizationSummaryHasNoDatabaseColumns = Assert<
  SameKeys<OrganizationSummaryKeys, ExpectedOrganizationSummaryKeys>
>;
