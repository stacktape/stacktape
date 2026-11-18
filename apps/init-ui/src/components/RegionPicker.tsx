import { Select, type SelectOption } from '@stacktape/ui-react/select';

/**
 * The region the file declares, picked from the ones most people choose. A region already set to something else (by
 * the AWS profile, say) is added to the list rather than silently replaced.
 */
const COMMON_REGIONS: Array<{ id: string; label: string }> = [
  { id: 'us-east-1', label: 'N. Virginia (us-east-1)' },
  { id: 'us-west-2', label: 'Oregon (us-west-2)' },
  { id: 'eu-west-1', label: 'Ireland (eu-west-1)' },
  { id: 'eu-central-1', label: 'Frankfurt (eu-central-1)' },
  { id: 'ap-southeast-1', label: 'Singapore (ap-southeast-1)' },
  { id: 'ap-southeast-2', label: 'Sydney (ap-southeast-2)' }
];

export function RegionPicker({
  value,
  onChange,
  isDisabled = false
}: {
  value: string;
  onChange: (region: string) => void;
  isDisabled?: boolean;
}) {
  const isCommon = COMMON_REGIONS.some((region) => region.id === value);
  const options = [
    ...COMMON_REGIONS.map((region) => ({ value: region.id, label: region.label })),
    ...(isCommon ? [] : [{ value, label: value }])
  ];

  return (
    <Select
      disabled={isDisabled}
      label="Region"
      name="region"
      onChange={(selected) => {
        if (selected !== null && !Array.isArray(selected)) onChange((selected as SelectOption<string>).value);
      }}
      options={options}
      reserveMessageSpace={false}
      value={options.find((option) => option.value === value) ?? null}
    />
  );
}
