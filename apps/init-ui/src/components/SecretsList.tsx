import { Button } from '@stacktape/ui-react/button';
import { IconButton } from '@stacktape/ui-react/icon-button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { TextField } from '@stacktape/ui-react/text-field';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { Fragment, useState } from 'react';
import { BiCheck, BiErrorCircle, BiRefresh, BiX } from 'react-icons/bi';
import {
  generateSecretValue,
  isReadyDraft,
  localValueReason,
  type SecretDraft,
  type SecretEntry,
  type SecretsPlan
} from '../secrets-model';
import { InfoTip } from './InfoTip';

const LOCAL_WORDS = {
  local: 'Points at this machine. Change it before saving.',
  example: 'Looks like an example value. Change it before saving.'
} as const;

/** A secret removed from the configuration, kept on the list so it can be put back. */
export type RemovedSecret = { name: string; variable: string };

/**
 * The secrets the app reads, as one list. Every row is the variable, where the code reads it, and its value: a random
 * one already in the field for a secret only the app uses, the project's `.env` value where it has one, otherwise empty.
 * Nothing leaves the page until Save. A row the app does not need is removed from the configuration with its ×, and
 * stays at the bottom of the list, struck through, to be put back.
 */
export function SecretsList({
  plan,
  saved,
  drafts,
  environmentFile,
  failure,
  removed,
  removing,
  canRemove,
  onDraft,
  onSave,
  onRemove,
  onConfirm,
  showConfirm
}: {
  plan: SecretsPlan;
  saved: ReadonlySet<string>;
  drafts: Readonly<Record<string, SecretDraft | undefined>>;
  /** The `.env` file the values came from, when there is one. */
  environmentFile: string | undefined;
  failure: { name: string; detail: string } | undefined;
  removed: readonly RemovedSecret[];
  /** The secret whose removal (or return) is being applied. */
  removing: string | undefined;
  /** False while the file is edited by hand: the user removes a variable there. */
  canRemove: boolean;
  onDraft: (name: string, draft: SecretDraft) => void;
  /** Saves these one after another; resolves once done or at the first failure. */
  onSave: (entries: readonly SecretEntry[]) => Promise<void>;
  onRemove: (secret: RemovedSecret, isRemoved: boolean) => void;
  onConfirm: () => void;
  showConfirm: boolean;
}) {
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const [replacing, setReplacing] = useState<ReadonlySet<string>>(new Set());
  const unsaved = plan.entries.filter((entry) => !saved.has(entry.name) || replacing.has(entry.name));
  const ready = unsaved.filter((entry) => isReadyDraft(drafts[entry.name]));
  const readers = new Set(plan.groups.map((group) => group.resourceName));
  const allSecrets = ready.every((entry) => entry.kind !== 'setting');
  // A removed secret is listed as removed, not again as one the deploy does not need.
  const notNeeded = plan.notNeeded.filter((variable) => !removed.some((secret) => secret.variable === variable));

  const save = async (entries: readonly SecretEntry[]) => {
    if (entries.length === 0) return;
    setSaving(new Set(entries.map((entry) => entry.name)));
    await onSave(entries);
    setSaving(new Set());
    setReplacing((current) => new Set([...current].filter((name) => !entries.some((entry) => entry.name === name))));
  };

  return (
    <div className="w-secrets">
      <ul className="w-secret-list">
        {plan.entries.map((entry) => {
          const draft = drafts[entry.name];
          const isSaved = saved.has(entry.name) && !replacing.has(entry.name);
          const reader =
            readers.size > 1 ? plan.groups.find((group) => group.entries.includes(entry))?.resourceName : undefined;
          const local = draft === undefined || draft.origin === 'random' ? undefined : localValueReason(draft.value);
          const where =
            entry.note ?? (entry.source === undefined ? undefined : `${entry.source.file}:${entry.source.line}`);
          return (
            <li
              className={`w-secret${local === undefined ? '' : ' is-local'}`}
              id={`secret-${entry.name}`}
              key={entry.name}
            >
              <div className="w-secret-label">
                <span className="w-secret-name">
                  {entry.variable}
                  {entry.maybeUnneeded !== undefined && !isSaved && (
                    <Tooltip content={entry.maybeUnneeded}>
                      <button
                        aria-label={`May not be needed: ${entry.maybeUnneeded}`}
                        className="w-secret-maybe"
                        type="button"
                      >
                        May not be needed
                      </button>
                    </Tooltip>
                  )}
                </span>
                {(where !== undefined || reader !== undefined) && (
                  <span className="w-secret-source">
                    {[reader === undefined ? undefined : `read by ${reader}`, where].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              {isSaved ? (
                <div className="w-secret-saved">
                  <span className="w-saved">
                    <BiCheck aria-hidden size={16} /> Saved
                  </span>
                  <span aria-label="Value hidden" className="w-secret-mask">
                    ••••••••
                  </span>
                  <button
                    className="w-link w-small"
                    onClick={() => {
                      setReplacing((current) => new Set([...current, entry.name]));
                      onDraft(entry.name, { value: '', origin: 'typed' });
                    }}
                    type="button"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <form
                  className="w-secret-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if ((draft?.value ?? '').trim() !== '') void save([entry]);
                  }}
                >
                  <TextField
                    aria-label={`Value for ${entry.name}`}
                    autoComplete="off"
                    disabled={saving.has(entry.name)}
                    onChange={(event) => onDraft(entry.name, { value: event.target.value, origin: 'typed' })}
                    placeholder={
                      entry.kind === 'outside' ? 'URL' : entry.kind === 'setting' ? 'Value' : 'Paste the value'
                    }
                    reserveMessageSpace={false}
                    spellCheck={false}
                    trailing={
                      saving.has(entry.name) ? (
                        <Spinner />
                      ) : (
                        <DraftOrigin
                          draft={draft}
                          entry={entry}
                          environmentFile={environmentFile}
                          onRandom={() =>
                            onDraft(entry.name, { value: generateSecretValue(entry.variable), origin: 'random' })
                          }
                        />
                      )
                    }
                    type={entry.kind === 'secret' ? 'password' : 'text'}
                    value={draft?.value ?? ''}
                  />
                  {/* Enter saves the row; the button below saves them all. */}
                  <button className="sr-only" tabIndex={-1} type="submit">
                    Save {entry.variable}
                  </button>
                </form>
              )}
              <Tooltip
                content={
                  canRemove ? 'Not needed? Remove it from the config.' : 'Your file is edited by hand. Remove it there.'
                }
              >
                <span className="w-secret-remove">
                  <IconButton
                    aria-disabled={!canRemove || undefined}
                    data-testid="secret-dismiss"
                    icon={<BiX size={18} />}
                    isLoading={removing === entry.name}
                    label={`Remove ${entry.variable} from the config`}
                    onClick={() => {
                      if (canRemove) onRemove({ name: entry.name, variable: entry.variable }, true);
                    }}
                    size={30}
                    variant="plain"
                  />
                </span>
              </Tooltip>
              {local !== undefined && (
                <p className="w-secret-note is-local">
                  <BiErrorCircle aria-hidden size={14} />
                  {LOCAL_WORDS[local]}
                </p>
              )}
              {failure?.name === entry.name && <p className="w-error-text w-secret-note">{failure.detail}</p>}
            </li>
          );
        })}
        {removed.map((secret) => (
          <li className="w-secret is-removed" key={secret.name}>
            <div className="w-secret-label">
              <span className="w-secret-name">{secret.variable}</span>
              <span className="w-secret-source">Removed from the config. The app no longer reads it.</span>
            </div>
            <button
              className="w-link w-small w-secret-restore"
              disabled={removing === secret.name}
              onClick={() => onRemove(secret, false)}
              type="button"
            >
              {removing === secret.name ? <Spinner /> : 'Put back'}
            </button>
          </li>
        ))}
      </ul>

      {(plan.setByStacktape.length > 0 || notNeeded.length > 0) && (
        <p className="w-secret-aside">
          {plan.setByStacktape.length > 0 && (
            <span>
              <CodeList names={plan.setByStacktape} /> {plan.setByStacktape.length === 1 ? 'is' : 'are'} set by
              Stacktape.
              <InfoTip about="secrets Stacktape sets">
                The database password. The deploy creates it and gives it to the app.
              </InfoTip>
            </span>
          )}
          {notNeeded.length > 0 && (
            <span>
              Not needed to deploy: <CodeList names={notNeeded} />.
              <InfoTip about="secrets the deploy does not need">
                Your code reads {notNeeded.length === 1 ? 'it' : 'them'} only in a build or test tool, or has a
                fallback, so the app starts without {notNeeded.length === 1 ? 'it' : 'them'}. Add{' '}
                {notNeeded.length === 1 ? 'it' : 'one'} as a secret later if you need it.
              </InfoTip>
            </span>
          )}
        </p>
      )}

      {(ready.length > 0 || showConfirm) && (
        <div className="w-secrets-foot">
          {showConfirm ? (
            <button className="w-link w-small" onClick={onConfirm} type="button">
              I already saved these in AWS
            </button>
          ) : (
            <span />
          )}
          {ready.length > 0 && (
            <Button
              data-next-action
              isLoading={saving.size > 1}
              onClick={() => void save(ready)}
              variant={ready.length === unsaved.length ? 'primary' : 'secondary'}
            >
              Save {ready.length}{' '}
              {allSecrets ? (ready.length === 1 ? 'secret' : 'secrets') : ready.length === 1 ? 'value' : 'values'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Where the value in a field came from, at its right edge: a fresh random value, or the project's `.env`. */
function DraftOrigin({
  entry,
  draft,
  environmentFile,
  onRandom
}: {
  entry: SecretEntry;
  draft: SecretDraft | undefined;
  environmentFile: string | undefined;
  onRandom: () => void;
}) {
  if (draft?.origin === 'env' && draft.value !== '') {
    return (
      <Tooltip content={`The value your ${environmentFile ?? '.env'} sets. Check it is right for AWS.`}>
        <span className="w-draft-tag">{environmentFile ?? '.env'}</span>
      </Tooltip>
    );
  }
  if (!entry.canGenerate) return null;
  return (
    <Tooltip
      content={
        draft?.origin === 'random'
          ? 'A strong random value, made in this page. Click for a new one.'
          : 'Fill in a strong random value'
      }
    >
      <button className="w-draft-tag is-action" onClick={onRandom} type="button">
        {draft?.origin === 'random' ? (
          <>
            <BiRefresh aria-hidden size={13} /> Random
          </>
        ) : (
          'Use a random value'
        )}
      </button>
    </Tooltip>
  );
}

function CodeList({ names }: { names: readonly string[] }) {
  return (
    <>
      {names.map((name, index) => (
        <Fragment key={name}>
          {index > 0 && ', '}
          <span className="w-code">{name}</span>
        </Fragment>
      ))}
    </>
  );
}
