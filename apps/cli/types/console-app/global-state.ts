// GENERATED FILE - DO NOT EDIT
// Source: console-app/scripts/generate-stacktape-console-types.ts

import type { CurrentUserAndOrgDataResponse } from './trpc/api-key-protected';

export type GlobalStateUser = CurrentUserAndOrgDataResponse['user'];
export type GlobalStateOrganization = CurrentUserAndOrgDataResponse['organization'];
export type GlobalStateConnectedAwsAccount = CurrentUserAndOrgDataResponse['connectedAwsAccounts'][number];
export type GlobalStateProject = CurrentUserAndOrgDataResponse['projects'][number];
