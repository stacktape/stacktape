/**
 * Which AWS region to deploy into.
 *
 * A short list rather than all thirty-odd. Someone deploying for the first time wants the one
 * nearest their users, and a menu of every region AWS operates — including ones that need to be
 * enabled first — is a worse answer than six that always work plus the ability to type another.
 */

const COMMON_REGIONS: Array<{ id: string; label: string }> = [
  { id: 'us-east-1', label: 'N. Virginia (us-east-1)' },
  { id: 'us-west-2', label: 'Oregon (us-west-2)' },
  { id: 'eu-west-1', label: 'Ireland (eu-west-1)' },
  { id: 'eu-central-1', label: 'Frankfurt (eu-central-1)' },
  { id: 'ap-southeast-1', label: 'Singapore (ap-southeast-1)' },
  { id: 'ap-southeast-2', label: 'Sydney (ap-southeast-2)' }
];

export function RegionPicker({ value, onChange }: { value: string; onChange: (region: string) => void }) {
  const isCommon = COMMON_REGIONS.some((region) => region.id === value);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.85rem] font-medium">Region</span>
      <select className="wizard-input" onChange={(changed) => onChange(changed.target.value)} value={value}>
        {COMMON_REGIONS.map((region) => (
          <option key={region.id} value={region.id}>
            {region.label}
          </option>
        ))}
        {/* Whatever the environment already named, when it is not one of the six above. */}
        {!isCommon && <option value={value}>{value}</option>}
      </select>
      <span className="text-[0.78rem] text-[var(--stp-text-subtle)]">Pick the one closest to your users.</span>
    </label>
  );
}
