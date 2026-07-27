import type { CurrentUserAndOrgDataResponse } from '@stacktape/console-api/api-key';

export type GlobalStateUser = CurrentUserAndOrgDataResponse['user'];
export type GlobalStateOrganization = CurrentUserAndOrgDataResponse['organization'];
export type GlobalStateConnectedAwsAccount = CurrentUserAndOrgDataResponse['connectedAwsAccounts'][number];
export type GlobalStateProject = CurrentUserAndOrgDataResponse['projects'][number];
