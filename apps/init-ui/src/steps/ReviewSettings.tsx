import {
  SETTING_GROUP_LABELS,
  SETTING_GROUPS,
  isDomainName,
  type ResourceSetting,
  type SettingValue
} from '@stacktape/config-inference/compose/resource-settings';
import { Button } from '@stacktape/ui-react/button';
import { RadioGroup } from '@stacktape/ui-react/radio-group';
import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { getResourceVisual, RESOURCE_CATEGORY_COLORS } from '@stacktape/ui-react/resource-icon/catalog';
import { Select, type SelectOption } from '@stacktape/ui-react/select';
import { Switch } from '@stacktape/ui-react/switch';
import { Tabs } from '@stacktape/ui-react/tabs';
import { TextField } from '@stacktape/ui-react/text-field';
import { Tooltip } from '@stacktape/ui-react/tooltip';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { BiChevronDown, BiChevronLeft, BiChevronRight, BiCodeAlt, BiX } from 'react-icons/bi';
import { AnimatedPrice } from '../components/AnimatedPrice';
import { InfoTip } from '../components/InfoTip';
import type { WizardState } from '../session';
import type { Citation, ResourceStory } from '../workspace/resource-story';
import { EvidenceLine } from '../workspace/EvidenceLine';
import {
  billedByUse,
  costLineLabel,
  costLinesOf,
  costShares,
  keyedLines,
  money,
  optionPrice,
  perMillionRequests,
  requestCount,
  trafficExamples,
  usageRate
} from './review-costs';
import { awsServiceOf, sizeSummary } from './review-model';
import type { SettingTerms } from './review-version';

type Price = NonNullable<NonNullable<WizardState['composition']>['price']>;
type Resource = { type: string; properties: Record<string, unknown> };

/** A resource's colour: its category's, the same the diagram paints it in. */
export const categoryColor = (type: string): string =>
  RESOURCE_CATEGORY_COLORS[getResourceVisual(type)?.category ?? 'neutral'];

// ── One setting ─────────────────────────────────────────────────────────────────────────────────

/**
 * A setting's name the way `terms` asks for: the plain one with AWS's under it, one of them alone, or AWS's first.
 * The help mark beside it says what it does and what it costs.
 */
function SettingName({ setting, terms }: { setting: ResourceSetting; terms: SettingTerms }) {
  const primary = terms === 'aws' ? setting.awsTerm : setting.label;
  const secondary = terms === 'both' ? setting.awsTerm : terms === 'aws' ? setting.label : undefined;
  return (
    <div className="rv-setting-label">
      <span className="rv-setting-name">
        {primary}
        <InfoTip about={setting.label.toLowerCase()}>{setting.about}</InfoTip>
      </span>
      {secondary !== undefined && (
        <span className="rv-setting-term" data-terms={terms}>
          {secondary}
        </span>
      )}
    </div>
  );
}

type ControlProps = {
  resourceName: string;
  setting: ResourceSetting;
  value: SettingValue;
  price: Price | undefined;
  disabled: boolean;
  onChange: (value: SettingValue) => void;
};

/** A few short options side by side; the ones not picked say what they would change the price by. */
function Segmented({ resourceName, setting, value, price, disabled, onChange }: ControlProps) {
  return (
    <Tabs
      appearance="segmented"
      ariaLabel={setting.label}
      disabled={disabled}
      onValueChange={(next) => {
        const option = setting.options.find((candidate) => String(candidate.value) === next);
        if (option !== undefined) onChange(option.value);
      }}
      size="small"
      tabs={setting.options.map((option) => {
        const delta = option.value === value ? undefined : optionPrice(price, resourceName, setting, option.value);
        const text = (
          <span className="rv-option">
            {option.label}
            {delta !== undefined && <span className="rv-option-price"> {delta.text}</span>}
          </span>
        );
        const help = option.disabledReason ?? option.detail;
        return {
          value: String(option.value),
          disabled: option.disabledReason !== undefined,
          label:
            help === undefined ? (
              text
            ) : (
              <Tooltip content={help} maxWidth={260} placement="top">
                {text}
              </Tooltip>
            )
        };
      })}
      value={String(value)}
      width="fit"
    />
  );
}

/** Many options, or long ones (an engine version, storage sizes with their prices): a select. */
function Dropdown({ resourceName, setting, value, price, disabled, onChange }: ControlProps) {
  const options: Array<SelectOption<string>> = setting.options.map((option) => {
    const delta = option.value === value ? undefined : optionPrice(price, resourceName, setting, option.value);
    return {
      value: String(option.value),
      label: (
        <span className="rv-select-option">
          <span>
            {option.label}
            {option.detail !== undefined && <span className="rv-select-detail"> {option.detail}</span>}
          </span>
          {delta !== undefined && <span className="rv-option-price">{delta.text}</span>}
        </span>
      ),
      searchText: option.label,
      valueLabel: option.label,
      isDisabled: option.disabledReason !== undefined
    };
  });
  return (
    <Select
      disabled={disabled}
      hideLabel
      label={setting.label}
      name={`${setting.id}`}
      onChange={(picked) => {
        if (picked === null || Array.isArray(picked)) return;
        const option = setting.options.find(
          (candidate) => String(candidate.value) === (picked as SelectOption<string>).value
        );
        if (option !== undefined) onChange(option.value);
      }}
      options={options}
      reserveMessageSpace={false}
      value={options.find((option) => option.value === String(value)) ?? null}
      width={setting.priced ? 200 : 150}
    />
  );
}

/** On or off, with what turning it on (or off) would change the price by. */
function Toggle({ resourceName, setting, value, price, disabled, onChange }: ControlProps) {
  const other = !(value === true);
  const delta = optionPrice(price, resourceName, setting, other);
  return (
    <span className="rv-toggle">
      {delta !== undefined && <span className="rv-option-price">{delta.text}</span>}
      <Switch
        checked={value === true}
        disabled={disabled}
        label={setting.label}
        onCheckedChange={(checked) => onChange(checked)}
      />
    </span>
  );
}

/**
 * The real AWS sizes, each with what it has and what it costs a month: the size list the "Small / Standard / Large"
 * choice became. A Lambda memory list shows what a million requests would cost instead, since it is billed by use.
 */
function SizeList({
  resourceName,
  setting,
  value,
  price,
  disabled,
  onChange,
  lines
}: ControlProps & { lines: Price['lines'] }) {
  const ownLines = lines?.[resourceName] ?? [];
  // One name column for the list, as wide as its longest name, so the details and prices line up.
  const nameWidth = Math.max(...setting.options.map((option) => option.label.length));
  return (
    <RadioGroup
      style={{ '--rv-size-name': `${nameWidth}ch` } as CSSProperties}
      className="rv-sizes"
      disabled={disabled}
      name={`${resourceName}-${setting.id}`}
      onValueChange={(next) => {
        const option = setting.options.find((candidate) => candidate.value === next);
        if (option !== undefined) onChange(option.value);
      }}
      options={setting.options.map((option) => {
        const amount = optionPrice(price, resourceName, setting, option.value);
        const perMillion =
          amount === undefined && typeof option.value === 'number' && setting.id === 'memory'
            ? perMillionRequests(ownLines, option.value)
            : undefined;
        return {
          value: option.value as string | number,
          disabled: option.disabledReason !== undefined,
          label: (
            <span className="rv-size">
              <span className="rv-size-name">{option.label}</span>
              <span className="rv-size-detail">
                {option.detail}
                {option.tag !== undefined && <span className="rv-size-tag">{option.tag}</span>}
              </span>
              <span className="rv-size-price">
                {amount !== undefined ? (
                  amount.text
                ) : perMillion !== undefined ? (
                  <Tooltip content="For a million requests of 100 ms each" maxWidth={240} placement="top">
                    <span>{money(perMillion)} / 1M req</span>
                  </Tooltip>
                ) : price?.settings === undefined && setting.priced ? (
                  <span aria-hidden className="rv-skeleton" />
                ) : null}
              </span>
            </span>
          )
        };
      })}
      value={value as string | number}
    />
  );
}

/** A domain typed in and saved with Enter or the button; empty means none. */
function DomainField({ setting, value, disabled, onChange }: ControlProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const trimmed = draft.trim().toLowerCase();
  const invalid = trimmed !== '' && !isDomainName(trimmed);
  const changed = trimmed !== String(value);
  const save = () => {
    if (!invalid && changed) onChange(trimmed);
  };
  return (
    <form
      className="rv-domain"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <TextField
        aria-label={setting.label}
        disabled={disabled}
        {...(invalid ? { message: 'A domain like app.example.com', messageTone: 'error' as const } : {})}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="app.example.com"
        reserveMessageSpace={false}
        spellCheck={false}
        value={draft}
      />
      {changed && (
        <Button className="rv-domain-save" disabled={disabled || invalid} type="submit" variant="secondary">
          {trimmed === '' ? 'Remove' : 'Save'}
        </Button>
      )}
    </form>
  );
}

const isShortChoice = (setting: ResourceSetting) =>
  // Priced options carry their price beside them: more than three no longer fit side by side.
  setting.options.length <= (setting.priced ? 3 : 5) &&
  setting.options.reduce((sum, option) => sum + option.label.length, 0) <= 34 &&
  setting.id !== 'version';

function SettingRow({
  resourceName,
  setting,
  terms,
  value,
  price,
  lockedReason,
  onChange
}: {
  resourceName: string;
  setting: ResourceSetting;
  terms: SettingTerms;
  value: SettingValue;
  price: Price | undefined;
  lockedReason: string | undefined;
  onChange: (value: SettingValue) => void;
}) {
  const reason = setting.disabledReason ?? lockedReason;
  const props: ControlProps = { resourceName, setting, value, price, disabled: reason !== undefined, onChange };
  const wide = setting.control === 'size' || setting.control === 'domain';
  return (
    <div className="rv-setting" data-control={setting.control} data-wide={wide ? 'true' : undefined}>
      <SettingName setting={setting} terms={terms} />
      <div className="rv-setting-control">
        {setting.control === 'size' ? (
          <SizeList {...props} lines={price?.lines} />
        ) : setting.control === 'toggle' ? (
          <Toggle {...props} />
        ) : setting.control === 'domain' ? (
          <DomainField {...props} />
        ) : isShortChoice(setting) ? (
          <Segmented {...props} />
        ) : (
          <Dropdown {...props} />
        )}
      </div>
      {reason !== undefined && <p className="rv-setting-reason">{reason}</p>}
    </div>
  );
}

// ── A resource ──────────────────────────────────────────────────────────────────────────────────

/** What the resource costs a month: its fixed amount, "+ usage" when part is billed by use, or "Pay per use". */
export function ResourcePrice({ price, name }: { price: Price | undefined; name: string }) {
  const amount = price?.resourceFlat?.[name];
  const usage = billedByUse(price, name);
  if (price === undefined) return <span aria-hidden className="rv-skeleton rv-skeleton--price" />;
  if (amount === undefined) return <span className="rv-price rv-price--muted">Price unknown</span>;
  if (amount === 0) return <span className="rv-price rv-price--muted">{usage ? 'Pay per use' : 'Free'}</span>;
  return (
    <span className="rv-price">
      <AnimatedPrice text={`${money(amount)} /mo`} />
      {usage && <span className="rv-price-usage">+ usage</span>}
    </span>
  );
}

/** What the price is made of: the instance, its storage, the public address; the rates of what is billed by use. */
function CostLines({ price, name, memory }: { price: Price | undefined; name: string; memory: number | undefined }) {
  const lines = costLinesOf(price, name);
  if (lines.length === 0) return null;
  const perMillion = memory === undefined ? undefined : perMillionRequests(lines, memory);
  return (
    <dl className="rv-lines">
      {keyedLines(lines).map(({ line, key }) => (
        <div className="rv-line" data-usage={line.monthly === undefined ? 'true' : undefined} key={key}>
          <dt>{costLineLabel(line)}</dt>
          <dd>{line.monthly === undefined ? (usageRate(line) ?? 'By use') : `${money(line.monthly)}/mo`}</dd>
        </div>
      ))}
      {perMillion !== undefined && (
        <div className="rv-line rv-line--example">
          <dt>A million requests at 100 ms</dt>
          <dd>≈ {money(perMillion)}</dd>
        </div>
      )}
    </dl>
  );
}

export type ResourcePanelProps = {
  name: string;
  resource: Resource;
  story: ResourceStory | undefined;
  citation: Citation | undefined;
  settings: ResourceSetting[];
  price: Price | undefined;
  terms: SettingTerms;
  /** Why nothing can be changed right now (disconnected, deploying), if so. */
  lockedReason: string | undefined;
  /** stacktape.yml has the user's edits: settings write into them, but a change that recomposes the file waits. */
  isEdited: boolean;
  /** Values just picked, shown until the file says them. */
  pending: Readonly<Record<string, SettingValue>>;
  onSetting: (setting: string, value: SettingValue) => void;
  onShowInFile: () => void;
  /** `inspector`: a panel of its own with a way back to all resources. `card`: the body of an opened card. */
  appearance: 'inspector' | 'card';
  onBack?: () => void;
  onClose?: () => void;
};

/**
 * Everything about one resource: what it is and what it runs on, what its price is made of, and every setting it has,
 * grouped, with the rare ones folded under "More settings". Why it is there closes it, in one quiet line.
 */
export function ResourcePanel({
  name,
  resource,
  story,
  citation,
  settings,
  price,
  terms,
  lockedReason,
  isEdited,
  pending,
  onSetting,
  onShowInFile,
  appearance,
  onBack,
  onClose
}: ResourcePanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const shown = settings.filter((setting) => !setting.advanced || showAdvanced);
  const folded = settings.filter((setting) => setting.advanced);
  const memory = settings.find((setting) => setting.id === 'memory')?.value;
  const service = awsServiceOf(resource);
  const reasonFor = (setting: ResourceSetting) =>
    lockedReason ??
    (isEdited && setting.preference !== undefined
      ? 'Not while stacktape.yml has your edits: it adds or removes resources'
      : undefined);

  return (
    <div className="rv-resource" data-appearance={appearance}>
      {appearance === 'inspector' && (
        <header className="rv-resource-head">
          <div className="rv-resource-nav">
            {onBack !== undefined && (
              <button className="rv-back" onClick={onBack} type="button">
                <BiChevronLeft aria-hidden size={18} />
                All resources
              </button>
            )}
            {onClose !== undefined && (
              <button aria-label="Close" className="rv-close" onClick={onClose} type="button">
                <BiX aria-hidden size={18} />
              </button>
            )}
          </div>
          <div className="rv-resource-title">
            <span className="rv-resource-icon" style={{ '--rv-tone': categoryColor(resource.type) } as CSSProperties}>
              <ResourceIcon resourceType={resource.type} size={22} />
            </span>
            <h2 className="rv-resource-name">{story?.plainName ?? name}</h2>
            <ResourcePrice name={name} price={price} />
            <p className="rv-resource-sub">
              <code>{name}</code>
              {service !== undefined && <span> · {service}</span>}
            </p>
          </div>
        </header>
      )}
      <CostLines memory={typeof memory === 'number' ? memory : undefined} name={name} price={price} />

      {SETTING_GROUPS.map((group) => {
        const inGroup = shown.filter((setting) => setting.group === group);
        if (inGroup.length === 0) return null;
        return (
          <section aria-label={SETTING_GROUP_LABELS[group]} className="rv-group" key={group}>
            <h3 className="rv-group-title">{SETTING_GROUP_LABELS[group]}</h3>
            {inGroup.map((setting) => (
              <SettingRow
                key={setting.id}
                lockedReason={reasonFor(setting)}
                onChange={(value) => onSetting(setting.id, value)}
                price={price}
                resourceName={name}
                setting={setting}
                terms={terms}
                value={pending[setting.id] ?? setting.value}
              />
            ))}
          </section>
        );
      })}
      {settings.length === 0 && (
        <p className="rv-empty">Nothing to set here. Edit its block in stacktape.yml for anything else.</p>
      )}
      {folded.length > 0 && !showAdvanced && (
        <button aria-expanded={false} className="rv-more" onClick={() => setShowAdvanced(true)} type="button">
          <span>More settings</span>
          <span className="rv-more-names">
            {folded.map((setting) => (terms === 'aws' ? setting.awsTerm : setting.label)).join(' · ')}
          </span>
          <BiChevronDown aria-hidden size={18} />
        </button>
      )}

      <footer className="rv-resource-foot">
        {story !== undefined && (
          <p className="rv-why">
            <span className="rv-why-label">Why</span>
            <EvidenceLine citation={citation} story={story} />
          </p>
        )}
        <button className="rv-show" onClick={onShowInFile} type="button">
          <BiCodeAlt aria-hidden size={15} />
          Show in stacktape.yml
        </button>
      </footer>
    </div>
  );
}

// ── All resources: the money ────────────────────────────────────────────────────────────────────

export type ResourceEntry = {
  name: string;
  resource: Resource;
  title: string;
  settings: ResourceSetting[];
};

/**
 * The monthly estimate as a picture: the total, one bar split by what each resource takes of it in the diagram's
 * colours, and a row per resource saying what the money buys. A row opens that resource's settings.
 */
export function CostOverview({
  entries,
  price,
  priceUnavailable,
  region,
  selected,
  hovered,
  onSelect,
  compact = false,
  rows = true
}: {
  entries: readonly ResourceEntry[];
  price: Price | undefined;
  priceUnavailable: boolean;
  region: string | undefined;
  selected: string | undefined;
  hovered: string | undefined;
  onSelect: (name: string) => void;
  /** Rows without the chevron or the itemized lines, for a card or a floating panel with less room. */
  compact?: boolean;
  /** No row per resource, where each resource has a card of its own with the same colour beside it. */
  rows?: boolean;
}) {
  const shares = costShares(
    price,
    entries.map((entry) => entry.name)
  );
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const total = price?.flatMonthly;
  const usage = entries.some((entry) => billedByUse(price, entry.name));
  return (
    <section aria-label="Monthly cost" className="rv-costs">
      <div className="rv-costs-head">
        <p className="rv-eyebrow">Estimated monthly cost</p>
        <p className="rv-total">
          {total !== undefined ? (
            <>
              <AnimatedPrice className="rv-total-figure" text={`${money(total)} /month`} />
              {usage && (
                <Tooltip
                  content="Requests, traffic and storage that grows are billed on top, by use. Each row below says at what rate."
                  maxWidth={280}
                  placement="top"
                >
                  <span className="rv-usage-tag">+ usage</span>
                </Tooltip>
              )}
            </>
          ) : priceUnavailable ? (
            <span className="rv-total-missing">Price unavailable offline</span>
          ) : (
            <span aria-label="Pricing" className="rv-skeleton rv-skeleton--total" />
          )}
        </p>
        {price !== undefined && <p className="rv-costs-note">AWS list prices in {region ?? price.region}</p>}
      </div>
      {total !== undefined && total > 0 && (
        <div aria-hidden className="rv-bar">
          {shares
            .filter((share) => share.share > 0)
            .map((share) => (
              <span
                className="rv-bar-part"
                data-active={share.name === (hovered ?? selected) ? 'true' : undefined}
                key={share.name}
                style={{
                  flexGrow: share.share,
                  background: categoryColor(byName.get(share.name)?.resource.type ?? '')
                }}
                title={byName.get(share.name)?.title}
              />
            ))}
        </div>
      )}
      {rows && (
        <ul className="rv-cost-rows">
          {shares.map((share) => {
            const entry = byName.get(share.name);
            if (entry === undefined) return null;
            const summary = sizeSummary(entry.settings);
            return (
              <li key={share.name}>
                <button
                  className="rv-cost-row"
                  data-active={share.name === selected ? 'true' : undefined}
                  data-hovered={share.name === hovered ? 'true' : undefined}
                  onClick={() => onSelect(share.name)}
                  type="button"
                >
                  <span aria-hidden className="rv-dot" style={{ background: categoryColor(entry.resource.type) }} />
                  <ResourceIcon resourceType={entry.resource.type} size={18} />
                  <span className="rv-cost-name">
                    <strong>{entry.title}</strong>
                    {summary !== undefined && <small>{summary}</small>}
                  </span>
                  <span className="rv-cost-amount">
                    <ResourcePrice name={share.name} price={price} />
                    {share.share > 0 && <small>{Math.round(share.share * 100)}%</small>}
                  </span>
                  {!compact && <BiChevronRight aria-hidden className="rv-cost-chevron" size={18} />}
                </button>
                {!compact && <ReceiptLines name={share.name} price={price} />}
              </li>
            );
          })}
        </ul>
      )}
      {(!compact || !rows) && <TrafficExamples entries={entries} price={price} />}
    </section>
  );
}

/**
 * "+ usage" in numbers: the month's total at a hundred thousand, a million and ten million requests, for a stack with
 * anything billed per request.
 */
function TrafficExamples({ entries, price }: { entries: readonly ResourceEntry[]; price: Price | undefined }) {
  const examples = trafficExamples(
    price,
    entries.map((entry) => {
      const memory = entry.settings.find((setting) => setting.id === 'memory')?.value;
      return { name: entry.name, ...(typeof memory === 'number' ? { memoryMb: memory } : {}) };
    })
  );
  if (examples === undefined) return null;
  return (
    <div className="rv-traffic">
      <p className="rv-traffic-title">
        With traffic
        <InfoTip about="the traffic estimate">
          The fixed amount plus requests at 100 ms each, at the rates above. Data sent out to visitors is billed on top
          (the first 100 GB a month are free).
        </InfoTip>
      </p>
      <dl className="rv-traffic-rows">
        {examples.map((example) => (
          <div key={example.requests}>
            <dt>{requestCount(example.requests)} requests a month</dt>
            <dd>≈ {money(example.total)}/mo</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The items under a resource's row in the overview: what its fixed amount is made of, and how usage is billed. */
function ReceiptLines({ price, name }: { price: Price | undefined; name: string }) {
  const lines = costLinesOf(price, name);
  if (lines.length === 0) return null;
  return (
    <ul className="rv-receipt">
      {keyedLines(lines).map(({ line, key }) => (
        <li data-usage={line.monthly === undefined ? 'true' : undefined} key={key}>
          <span>{costLineLabel(line)}</span>
          <span>{line.monthly === undefined ? (usageRate(line) ?? 'By use') : `${money(line.monthly)}/mo`}</span>
        </li>
      ))}
    </ul>
  );
}

/** A section of the overview with a small heading, the same look as a resource's setting groups. */
export function OverviewSection({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section aria-label={title} className="rv-group">
      <h3 className="rv-group-title">{title}</h3>
      {note !== undefined && <p className="rv-group-note">{note}</p>}
      {children}
    </section>
  );
}

/** A plain row for the overview's own settings (region, the analysis's choices): the name, its help, the control. */
export function PlainSettingRow({
  label,
  about,
  children,
  wide = false
}: {
  label: string;
  about: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="rv-setting" data-wide={wide ? 'true' : undefined}>
      <div className="rv-setting-label">
        <span className="rv-setting-name">
          {label}
          <InfoTip about={label.toLowerCase()}>{about}</InfoTip>
        </span>
      </div>
      <div className="rv-setting-control">{children}</div>
    </div>
  );
}
