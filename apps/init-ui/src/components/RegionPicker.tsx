import { Select, type SelectOption } from '@stacktape/ui-react/select';

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
  const options = [
    ...COMMON_REGIONS.map((region) => ({ value: region.id, label: region.label })),
    // Whatever the environment already named, when it is not one of the six above.
    ...(isCommon ? [] : [{ value, label: value }])
  ];

  return (
    <Select
      controlHeight={35}
      label="Region"
      name="region"
      onChange={(selected) => {
        if (selected !== null && !Array.isArray(selected)) onChange((selected as SelectOption<string>).value);
      }}
      options={options}
      reserveMessageSpace={false}
      value={options.find((option) => option.value === value) ?? null}
      width={260}
    />
  );
}
