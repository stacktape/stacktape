import type { StacktapeConfig } from '@stacktape/config';
import type {
  DeploymentPreferenceChange,
  DeploymentPreferenceKey,
  DeploymentPreferences
} from '@stacktape/config-inference/compose/preferences';
import { DEPLOYMENT_TOOL_LABELS } from '@stacktape/config-inference/facts/existing-deployment';
import { Button } from '@stacktape/ui-react/button';
import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { Spinner } from '@stacktape/ui-react/spinner';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BiBell, BiChevronRight, BiCodeAlt, BiInfoCircle, BiLockAlt } from 'react-icons/bi';
import { parse as parseYaml } from 'yaml';
import { AnimatedPrice } from '../components/AnimatedPrice';
import { RegionPicker } from '../components/RegionPicker';
import { Segmented } from '../components/Segmented';
import { DECISION_COPY } from '../decisions';
import type { EditorProblems } from '../editor/ConfigFileEditor';
import type { WizardState } from '../session';
import {
  alarmsOf,
  deploymentPreferenceKeysFor,
  filenameFor,
  plainList,
  plainResourceName,
  splitMonthly,
  summarise,
  technologyOf
} from './review-model';

/** Heavy on purpose, light on arrival: the diagram and the editor load after the page. */
const Diagram = lazy(() => import('../components/Diagram'));
const ConfigFileEditor = lazy(() => import('../editor/ConfigFileEditor'));

type Resources = Record<string, { type: string; properties: Record<string, unknown> }>;

type PreferenceCopy = {
  label: string;
  options: Array<{ value: string; label: string; help: string }>;
};

/** The settings, in a developer's words. One line of help for the option that is picked. */
const PREFERENCES: Record<DeploymentPreferenceKey, PreferenceCopy> = {
  capacity: {
    label: 'Starting size',
    options: [
      {
        value: 'economical',
        label: 'Small',
        help: 'The smallest useful sizes. Good for trying it out and dev stages.'
      },
      {
        value: 'balanced',
        label: 'Standard',
        help: 'Middle sizes; always-on apps add copies when they get busy. Resize any time.'
      },
      { value: 'performance', label: 'Large', help: 'Larger app and database sizes for steady, heavy traffic.' }
    ]
  },
  availability: {
    label: 'If a server fails',
    options: [
      { value: 'single', label: 'Restart it', help: 'One copy. A failure means a short outage while it restarts.' },
      {
        value: 'redundant',
        label: 'Stay online',
        help: 'A second copy in another data center takes over. Roughly doubles the app and database cost.'
      }
    ]
  },
  dataProtection: {
    label: 'Backups',
    options: [
      { value: 'lean', label: '1 day', help: 'One day of database backups. For data you can recreate.' },
      {
        value: 'protected',
        label: '7 days',
        help: 'A week of database backups and old file versions. Deleting the database is blocked either way.'
      }
    ]
  },
  databaseAccess: {
    label: 'Database reachable from',
    options: [
      {
        value: 'private',
        label: 'Private network',
        help: 'No public address. Adds a small access server your laptop and migrations connect through.'
      },
      {
        value: 'public',
        label: 'Internet',
        help: 'Has a public address: anyone can try to connect, and only the generated 32-character password over TLS gets in. Simplest for your laptop and migrations.'
      }
    ]
  }
};

/** "+$31/mo" as the segmented control shows it: "+$31". */
const shortDelta = (delta: string | undefined): string | undefined =>
  delta === undefined ? undefined : delta === 'Same price' ? 'same' : delta.replace('/mo', '').replace(/^-/, '−');

export function ReviewStep({
  state,
  busy,
  isLocked,
  format,
  onFormatChange,
  onPreference,
  onDecision,
  onRegion,
  onConfigText,
  onContinue
}: {
  state: WizardState;
  busy: string | undefined;
  /** Disconnected from the CLI: nothing can be changed until it is back. */
  isLocked: boolean;
  format: 'yaml' | 'typescript';
  onFormatChange: (format: 'yaml' | 'typescript') => void;
  onPreference: (change: DeploymentPreferenceChange) => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
  onConfigText: (yaml: string | null) => void;
  onContinue: () => void;
}) {
  const composition = state.composition;
  const generated = composition?.configText;
  const edit = state.configEdit;

  // What the user is typing, ahead of the server: sent after a pause, and shown until the server has caught up.
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorText = draft ?? edit?.yaml ?? generated?.yaml;
  const isEdited = edit !== undefined || (draft !== undefined && draft !== generated?.yaml);
  const changeText = (next: string) => {
    setDraft(next);
    clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => onConfigText(next === generated?.yaml ? null : next), 500);
  };
  const resetText = () => {
    clearTimeout(sendTimer.current);
    setDraft(undefined);
    onConfigText(null);
  };
  useEffect(() => () => clearTimeout(sendTimer.current), []);
  useEffect(() => {
    // The server has the same text now; the draft has done its job.
    if (draft !== undefined && (draft === edit?.yaml || (edit === undefined && draft === generated?.yaml))) {
      setDraft(undefined);
    }
  }, [draft, edit, generated?.yaml]);

  // The diagram and the list follow the edited file when it parses, so an edit is seen where it lands.
  const resources: Resources = useMemo(() => {
    const text = draft ?? edit?.yaml;
    if (text !== undefined) {
      try {
        const parsed = parseYaml(text) as { resources?: unknown } | null;
        if (parsed !== null && typeof parsed === 'object' && typeof parsed.resources === 'object') {
          return (parsed.resources ?? {}) as Resources;
        }
      } catch {
        // Keeps the last good picture while the text does not parse.
      }
    }
    return composition?.resources ?? {};
  }, [draft, edit?.yaml, composition?.resources]);

  const [selected, setSelected] = useState<string | undefined>(undefined);
  const select = useCallback(
    (name: string) => {
      if (resources[name] === undefined) return;
      setSelected((current) => (current === name ? undefined : name));
      document.getElementById(`resource-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    [resources]
  );

  const [problems, setProblems] = useState<EditorProblems>({ count: 0 });
  // The file is one click away rather than open: most people decide from the picture, the list and the settings.
  const [fileOpen, setFileOpen] = useState(false);
  const showFile = fileOpen || isEdited;
  const filename = filenameFor(isEdited ? 'yaml' : format, state.existingConfig !== undefined);
  const parseError = draft === undefined ? edit?.error : undefined;
  const price = composition?.price;
  const existingDeployments = state.facts?.existingDeployments ?? [];
  const services = state.facts?.services ?? [];

  return (
    <div className="w-enter">
      <header className="w-hero">
        <p className="w-eyebrow">Review</p>
        <h1 className="w-title">Your app on AWS</h1>
        <p className="w-lede">{summarise(state)}</p>
        <AnalysisReceipt state={state} />
      </header>

      {existingDeployments.length > 0 && (
        <p className="w-note mb-5 max-w-[var(--w-measure)]">
          <BiInfoCircle size={15} />
          <span>
            This project also has{' '}
            {plainList(
              existingDeployments.map(
                ({ tool }) => (DEPLOYMENT_TOOL_LABELS as Readonly<Record<string, string>>)[tool] ?? tool
              )
            )}{' '}
            config. Deploying creates a separate copy on AWS; nothing running there is touched.
          </span>
        </p>
      )}

      <div className="w-review">
        <div className="w-review-main">
          <section aria-label="Diagram" className="w-card w-diagram">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Spinner />
                </div>
              }
            >
              <Diagram
                ariaLabel="Diagram of what this configuration creates on AWS"
                config={{ resources } as unknown as StacktapeConfig}
                hint="Hover for what something does · click to see why it is here"
                initialZoom={1.15}
                onSelectResource={select}
                selectedResource={selected ?? null}
                style={{ width: '100%', height: '100%' }}
              />
            </Suspense>
          </section>

          <section aria-label="What gets created" className="w-card">
            <div className="w-card-head">
              <h2 className="w-card-title">What gets created</h2>
              <p className="w-card-note">
                {Object.keys(resources).length === 1 ? 'One resource' : `${Object.keys(resources).length} resources`},
                each with the code that called for it
              </p>
            </div>
            <ul className="w-resources">
              {Object.entries(resources).map(([name, resource]) => (
                <ResourceRow
                  framework={technologyOf(services.find((service) => service.name === name))}
                  isOpen={selected === name}
                  key={name}
                  name={name}
                  onToggle={() => setSelected(selected === name ? undefined : name)}
                  price={price?.byResource[name]}
                  provenance={composition?.provenance[name]}
                  resource={resource}
                />
              ))}
            </ul>
          </section>

          <section aria-label={filename} className="w-card" id="config-file">
            <div className="w-card-head">
              <div className="min-w-0">
                <h2 className="w-card-title flex items-center gap-2">
                  <BiCodeAlt size={16} /> {filename}
                </h2>
                {format === 'yaml' || isEdited ? (
                  <p className="w-editor-tips mt-1">
                    <span>Edit freely</span>
                    <span>Hover a key for its docs</span>
                    <span>
                      <kbd>Ctrl</kbd> + <kbd>Space</kbd> suggests
                    </span>
                  </p>
                ) : (
                  <p className="w-editor-tips mt-1">
                    <span>Read-only here. Switch to YAML to edit in the page.</span>
                  </p>
                )}
              </div>
              <div className="flex flex-none items-center gap-3">
                {showFile && (
                  <fieldset aria-label="File format" className="w-toggle">
                    <button
                      aria-pressed={format === 'yaml' || isEdited}
                      onClick={() => onFormatChange('yaml')}
                      type="button"
                    >
                      YAML
                    </button>
                    <button
                      aria-pressed={format === 'typescript' && !isEdited}
                      disabled={isEdited}
                      onClick={() => onFormatChange('typescript')}
                      title={isEdited ? 'Your edits are YAML. Reset to generated to pick TypeScript.' : undefined}
                      type="button"
                    >
                      TypeScript
                    </button>
                  </fieldset>
                )}
                {!isEdited && (
                  <Button onClick={() => setFileOpen(!fileOpen)} variant="secondary">
                    {fileOpen ? 'Close' : 'Open the file'}
                  </Button>
                )}
              </div>
            </div>
            {showFile && (
              <>
                <div className="w-editor-frame">
                  {format === 'typescript' && !isEdited ? (
                    generated?.typescript === undefined ? (
                      <div className="flex h-full items-center justify-center gap-3 text-[var(--w-subtle)]">
                        <Spinner /> Formatting…
                      </div>
                    ) : (
                      <Suspense fallback={<EditorLoading />}>
                        <ConfigFileEditor
                          key="typescript"
                          language="typescript"
                          onChange={() => {}}
                          onProblems={() => {}}
                          readOnly
                          value={generated.typescript}
                        />
                      </Suspense>
                    )
                  ) : (
                    <Suspense fallback={<EditorLoading />}>
                      <ConfigFileEditor
                        key="yaml"
                        language="yaml"
                        onChange={changeText}
                        onProblems={setProblems}
                        readOnly={isLocked}
                        value={editorText ?? ''}
                      />
                    </Suspense>
                  )}
                </div>
                <div
                  className={`w-editor-status${parseError !== undefined ? ' is-error' : isEdited ? ' is-edited' : ''}`}
                >
                  <span>
                    {parseError !== undefined
                      ? `This YAML does not parse: ${parseError}`
                      : isEdited
                        ? 'Edited by hand. This text is what gets saved and deployed, so the settings are off.'
                        : format === 'typescript'
                          ? 'Generated. Saved as stacktape.ts; TypeScript is not editable in this page.'
                          : 'Generated from your code and the settings. Changing a setting rewrites it.'}
                    {parseError === undefined && problems.count > 0 && (
                      <>
                        {' '}
                        <strong className="text-[var(--w-warn)]">
                          {problems.count === 1 ? '1 schema warning' : `${problems.count} schema warnings`}
                          {problems.first === undefined ? '' : ` (line ${problems.first.line})`}
                        </strong>
                      </>
                    )}
                  </span>
                  {isEdited && (
                    <button className="w-textbutton" onClick={resetText} type="button">
                      Reset to generated
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="w-side">
          <Settings
            busy={busy}
            isEdited={isEdited}
            isLocked={isLocked}
            onDecision={onDecision}
            onPreference={onPreference}
            onRegion={onRegion}
            onReset={resetText}
            state={state}
            types={Object.values(resources).map((resource) => resource.type)}
          />
        </aside>
      </div>

      <footer className="w-footer">
        <div className="w-footer-inner">
          <PriceSummary state={state} />
          <div className="w-footer-actions">
            <span className="w-footer-hint">
              {parseError !== undefined
                ? 'Fix the YAML to continue.'
                : `Saves ${filename} to your project. Nothing is created on AWS yet.`}
            </span>
            <Button
              className="w-big"
              disabled={isLocked || parseError !== undefined || busy !== undefined}
              isLoading={busy === 'write'}
              onClick={onContinue}
              variant="primary"
            >
              Continue to deploy
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-[var(--w-subtle)]">
      <Spinner /> Loading the editor…
    </div>
  );
}

/** The one line left of the analysis on later screens. */
function AnalysisReceipt({ state }: { state: WizardState }) {
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  const files = state.timeline.filter((entry) => entry.kind === 'tool' && entry.label.startsWith('read_file ')).length;
  return (
    <p className="w-receipt">
      <span className="w-receipt-item">
        <BiLockAlt size={13} />
        {agent === undefined || agent.id === 'none'
          ? 'Read from your project files, without AI'
          : `Read by your ${agent.label}${files > 0 ? `, ${files} ${files === 1 ? 'file' : 'files'} opened` : ''}`}
      </span>
      {state.repositoryPath !== undefined && <span className="w-receipt-item">{state.repositoryPath}</span>}
    </p>
  );
}

/** The fixed monthly price, counting when it changes, with its terms in one line. */
export function PriceSummary({ state }: { state: WizardState }) {
  const price = state.composition?.price;
  if (price === undefined) {
    return (
      <div className="w-price">
        <span className="w-price-value">
          {state.composition?.priceUnavailable === true ? (
            <span className="text-[15px] text-[var(--w-muted)]">Price unavailable offline</span>
          ) : (
            <span className="flex items-center gap-2 text-[15px] text-[var(--w-muted)]">
              <Spinner /> Pricing…
            </span>
          )}
        </span>
        <span className="w-price-note">Nothing else depends on the estimate.</span>
      </div>
    );
  }
  const { amount, usage } = splitMonthly(price.monthly);
  return (
    <div aria-live="polite" className="w-price">
      {amount === undefined ? (
        <span className="w-price-value">{price.monthly}</span>
      ) : (
        <AnimatedPrice className="w-price-value" text={`${amount} /month${usage ? ' + usage' : ''}`} />
      )}
      <span className="w-price-note">
        {usage ? 'Fixed part; traffic and requests are billed by use. ' : ''}AWS list prices, {price.region}
      </span>
    </div>
  );
}

function ResourceRow({
  name,
  resource,
  provenance,
  price,
  framework,
  isOpen,
  onToggle
}: {
  name: string;
  resource: { type: string; properties: Record<string, unknown> };
  provenance: { reason: string; evidence: Array<{ file: string; line: number; quote: string }> } | undefined;
  price: string | undefined;
  framework: string | undefined;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const alarms = alarmsOf(resource);
  const evidence = provenance?.evidence ?? [];
  const first = evidence[0];
  // A runtime's own reason is about Stacktape ("first-class support for Next.js"); the row says what it runs instead.
  const reason =
    provenance === undefined
      ? 'Added in the file by hand.'
      : framework !== undefined && provenance.reason.startsWith('Stacktape has first-class support')
        ? `Runs your ${framework} app, built the way ${framework} expects.`
        : provenance.reason;
  const why = first === undefined ? reason : `${reason} Seen in ${first.file}:${first.line}.`;
  return (
    <li className={`w-resource${isOpen ? ' is-open is-selected' : ''}`} id={`resource-${name}`}>
      <button aria-expanded={isOpen} className="w-resource-head" onClick={onToggle} type="button">
        <span className="w-resource-icon">
          <ResourceIcon resourceType={resource.type} size={20} />
        </span>
        <span className="min-w-0">
          <span className="w-resource-name">
            {plainResourceName(resource, framework)}
            <span className="w-resource-id">{name}</span>
          </span>
          <span className="w-resource-why block">{why}</span>
        </span>
        <span className={`w-resource-price${price === 'pay-per-use' ? ' is-usage' : ''}`}>
          {price === undefined ? '' : price === 'pay-per-use' ? 'Pay per use' : price}
        </span>
        <BiChevronRight aria-hidden className="w-chevron" size={18} />
      </button>
      {isOpen && (
        <div className="w-resource-body">
          {evidence.slice(0, 3).map((citation) => (
            <pre className="w-excerpt" key={`${citation.file}:${citation.line}`}>
              <span className="w-excerpt-file">
                {citation.file}:{citation.line}
              </span>
              <span className="w-excerpt-line">{citation.quote}</span>
            </pre>
          ))}
          {alarms.length > 0 && (
            <ul className="w-detail-list">
              {alarms.map((description) => (
                <li key={description}>
                  <BiBell size={13} />
                  <span>
                    Alarm in your AWS account when the {description.charAt(0).toLowerCase() + description.slice(1)}.
                  </span>
                </li>
              ))}
            </ul>
          )}
          {evidence.length === 0 && alarms.length === 0 && (
            <p className="m-0 text-[12.5px] text-[var(--w-subtle)]">Nothing more to show for this one.</p>
          )}
        </div>
      )}
    </li>
  );
}

function Settings({
  state,
  types,
  busy,
  isLocked,
  isEdited,
  onPreference,
  onDecision,
  onRegion,
  onReset
}: {
  state: WizardState;
  types: string[];
  busy: string | undefined;
  isLocked: boolean;
  isEdited: boolean;
  onPreference: (change: DeploymentPreferenceChange) => void;
  onDecision: (id: string, value: string) => void;
  onRegion: (region: string) => void;
  onReset: () => void;
}) {
  const preferences = state.preferences;
  const recommended = state.recommendedPreferences ?? preferences;
  const inert = new Set(state.composition?.inertChoices ?? []);
  const keys = deploymentPreferenceKeysFor(types).filter((key) => !inert.has(key));
  const deltas = state.composition?.price?.options;
  const decisions = (state.facts?.decisions ?? []).filter(
    (decision) => DECISION_COPY[decision.kind] !== undefined && decision.alternatives.length > 1
  );
  const disabled = isLocked || isEdited || busy !== undefined;

  return (
    <section aria-label="Settings" className="w-card w-settings">
      <div className="w-card-head">
        <h2 className="w-card-title">Settings</h2>
        <p className="w-card-note">Only what applies to this app</p>
      </div>
      <div className="w-setting">
        <RegionPicker isDisabled={disabled} onChange={onRegion} value={state.region ?? 'eu-west-1'} />
        <p className="w-setting-help">Pick the one closest to your users.</p>
      </div>
      {preferences !== undefined &&
        recommended !== undefined &&
        keys.map((key) => {
          const copy = PREFERENCES[key];
          const value = preferences[key] as string;
          const picked = copy.options.find((option) => option.value === value);
          return (
            <div className="w-setting" key={key}>
              <div className="w-setting-head">
                <p className="w-setting-label">{copy.label}</p>
                {value !== (recommended[key] as string) && (
                  <button
                    className="w-textbutton text-[11.5px]"
                    disabled={disabled}
                    onClick={() => onPreference({ key, value: recommended[key] } as DeploymentPreferenceChange)}
                    type="button"
                  >
                    Use recommended
                  </button>
                )}
              </div>
              <Segmented
                isDisabled={disabled}
                label={copy.label}
                onChange={(next) =>
                  onPreference({ key, value: next as DeploymentPreferences[typeof key] } as DeploymentPreferenceChange)
                }
                options={copy.options.map((option) => ({
                  value: option.value,
                  label: option.label,
                  note: option.value === value ? undefined : shortDelta(deltas?.[key]?.[option.value])
                }))}
                value={value}
              />
              <p className="w-setting-help">{picked?.help}</p>
            </div>
          );
        })}
      {decisions.map((decision) => {
        const copy = DECISION_COPY[decision.kind]!;
        const values = decision.alternatives;
        return (
          <div className="w-setting" key={decision.id}>
            <p className="w-setting-label">{copy.summary(decision.parameters, decision.chosen)}</p>
            <Segmented
              isDisabled={disabled}
              label={copy.summary(decision.parameters, decision.chosen)}
              onChange={(next) => onDecision(decision.id, next)}
              options={values.map((value) => ({ value, label: copy.option(value, decision.parameters) }))}
              value={decision.chosen}
            />
            <p className="w-setting-help">{copy.detail(decision.parameters, decision.chosen)}</p>
          </div>
        );
      })}
      {isEdited && (
        <div className="w-settings-locked">
          <p>You edited the file by hand, so these settings would overwrite your changes.</p>
          <button className="w-link w-textbutton" onClick={onReset} type="button">
            Reset to generated
          </button>
        </div>
      )}
    </section>
  );
}
