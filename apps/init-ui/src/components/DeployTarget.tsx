import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { TextField } from '@stacktape/ui-react/text-field';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import type { ReactNode } from 'react';
import { FaAws } from 'react-icons/fa';
import type { WizardAwsProfile, WizardState } from '../session';
import { InfoTip } from './InfoTip';
import { RegionPicker } from './RegionPicker';
import { groupedAccount } from './TargetFacts';

type Identity = NonNullable<WizardState['awsIdentity']>;

const KIND_WORDS: Record<WizardAwsProfile['kind'], string> = {
  sso: 'SSO sign-in',
  keys: 'Access key',
  role: 'Assumed role',
  other: 'Profile'
};

/**
 * Who the credentials sign in as, the way the AWS console's account menu says it: "IAM user dev", or for an SSO login
 * the person and their permission set, "dev@acme.io · AdministratorAccess".
 */
export const principalWords = (arn: string): string => {
  const resource = arn.split(':').slice(5).join(':');
  if (resource === 'root') return 'root user';
  const user = /^user\/(?:.*\/)?([^/]+)$/.exec(resource)?.[1];
  if (user !== undefined) return `IAM user ${user}`;
  const assumed = /^assumed-role\/([^/]+)\/(.+)$/.exec(resource);
  if (assumed !== null) {
    const [, role, session] = assumed;
    const permissionSet = /^AWSReservedSSO_(.+)_[0-9a-f]+$/.exec(role!)?.[1];
    return permissionSet === undefined ? `${session} · role ${role}` : `${session} · ${permissionSet}`;
  }
  return resource || arn;
};

/** The account as a person recognises it: its alias, then its ID; or the ID alone. */
function AccountValue({ profile, identity }: { profile: string | undefined; identity: Identity | undefined }) {
  const checking = identity === undefined;
  return (
    <span className="w-acct">
      {profile !== undefined && <span className="w-acct-profile">{profile}</span>}
      {checking ? (
        <span className="w-acct-id">Checking who this is…</span>
      ) : identity.available ? (
        <>
          <span className="w-acct-name">{identity.accountAlias ?? groupedAccount(identity.accountId)}</span>
          {identity.accountAlias !== undefined && (
            <span className="w-acct-id">{groupedAccount(identity.accountId)}</span>
          )}
        </>
      ) : (
        <span className="w-acct-id is-problem">
          {identity.reason === 'no-credentials' ? 'No credentials' : 'Not accepted by AWS'}
        </span>
      )}
    </span>
  );
}

/**
 * Where a deploy goes, as three controls that are always there: the AWS account (picked by its profile on this
 * machine), the region and the stage. The account shows what people know it by (the profile name, the account's alias),
 * with the ID beside it and who the credentials sign in as under it. Under the three, what deploying there does to the
 * stack.
 */
export function DeployTarget({
  state,
  identity,
  region,
  stage,
  isLocked,
  isSwitching,
  onProfile,
  onRegion,
  onStageChange,
  showRegionAndStage,
  stackLine
}: {
  state: WizardState;
  identity: Identity | undefined;
  region: string;
  stage: string;
  isLocked: boolean;
  /** A profile was just picked and its identity is being checked. */
  isSwitching: boolean;
  onProfile: (profile: string) => void;
  onRegion: (region: string) => void;
  onStageChange: (stage: string) => void;
  /** False while there are no working credentials: the page asks for those first. */
  showRegionAndStage: boolean;
  /** What deploying there does to the stack, or what stops it. */
  stackLine: ReactNode;
}) {
  const profiles = state.awsProfiles?.available ?? [];
  const current = state.awsProfiles?.selected ?? identity?.profile;
  const regionLocked = isLocked || state.configEdit !== undefined;
  const options: Array<SelectOption<string>> = profiles.map((profile) => {
    const isCurrent = profile.name === current;
    const known = isCurrent && identity?.available === true ? identity : undefined;
    return {
      value: profile.name,
      label: profile.name,
      searchText: profile.name,
      // The one in use names its account; the others say how they sign in and where, until one is picked.
      description: [
        known === undefined ? undefined : (known.accountAlias ?? groupedAccount(known.accountId)),
        known?.accountAlias === undefined ? undefined : groupedAccount(known.accountId),
        KIND_WORDS[profile.kind],
        known === undefined ? profile.region : undefined
      ]
        .filter(Boolean)
        .join(' · '),
      valueLabel: <AccountValue identity={isCurrent && !isSwitching ? identity : undefined} profile={profile.name} />
    };
  });
  const selected = options.find((option) => option.value === current) ?? null;
  const principal = identity?.available === true ? principalWords(identity.arn) : undefined;

  const accountHelp = (
    <InfoTip about="the AWS account">
      The AWS profile’s credentials decide the account: the stack is created there, and AWS bills that account. Profiles
      come from <span className="w-code">~/.aws/config</span> and <span className="w-code">~/.aws/credentials</span>. To
      add one, run <span className="w-code">aws configure --profile name</span>, then Check again.
    </InfoTip>
  );

  return (
    <div className="w-target">
      <div className="w-target-row">
        <span className="w-target-label" id="deploy-account-label">
          AWS account
          {accountHelp}
        </span>
        <div className="w-target-control">
          {selected !== null && profiles.length > 0 ? (
            <Tooltip content="A deploy is running with this profile." disabled={!isLocked}>
              <div data-testid="aws-target-switch">
                <Select<string>
                  disabled={isLocked}
                  hideLabel
                  label="AWS account"
                  leading={<FaAws aria-hidden className="w-acct-logo" size={18} />}
                  loading={isSwitching}
                  name="aws-profile"
                  onChange={(picked) => {
                    if (picked !== null && !Array.isArray(picked)) {
                      const value = (picked as SelectOption<string>).value;
                      if (value !== current) onProfile(value);
                    }
                  }}
                  options={options}
                  reserveMessageSpace={false}
                  searchable={profiles.length > 6}
                  value={selected}
                />
              </div>
            </Tooltip>
          ) : (
            <div className="w-target-static">
              <FaAws aria-hidden className="w-acct-logo" size={18} />
              <AccountValue identity={identity} profile={identity?.profile} />
            </div>
          )}
          {principal !== undefined && !isSwitching && identity?.available === true && (
            <p className="w-target-hint">
              {/* On a phone the control has room for the profile and the alias only; the ID moves here. */}
              {identity.accountAlias !== undefined && (
                <span className="w-target-hint-id">Account {groupedAccount(identity.accountId)} · </span>
              )}
              Signed in as {principal}
            </p>
          )}
        </div>
      </div>
      {showRegionAndStage && (
        <>
          <div className="w-target-row">
            <span className="w-target-label">Region</span>
            <div className="w-target-control">
              <Tooltip
                content="Your edited file declares the region. Change it there."
                disabled={state.configEdit === undefined}
              >
                <div className="w-target-region">
                  <RegionPicker hideLabel isDisabled={regionLocked} onChange={onRegion} value={region} />
                </div>
              </Tooltip>
            </div>
          </div>
          <div className="w-target-row">
            <span className="w-target-label">
              Stage
              <InfoTip about="stages">
                A separate copy of the app with its own resources, such as dev or production. The stack is named after
                the project and the stage.
              </InfoTip>
            </span>
            <div className="w-target-control">
              <TextField
                aria-label="Stage"
                disabled={isLocked}
                maxLength={12}
                onChange={(event) => onStageChange(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="dev"
                reserveMessageSpace={false}
                rootClassName="w-target-stage"
                spellCheck={false}
                value={stage}
              />
            </div>
          </div>
        </>
      )}
      {stackLine}
    </div>
  );
}
