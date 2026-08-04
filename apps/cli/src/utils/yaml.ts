import yaml from 'yaml';

// yaml.scalarOptions.str.defaultType = Type.QUOTE_SINGLE;

export const parseYaml = yaml.parse;
export const stringifyToYaml = (value: any, options?: yaml.Options) => {
  const stringifiedYaml = yaml.stringify(value, options);
  // replacing all string values (which are considered boolean in older versions of yaml) with quoted versions
  // otherwise cloudformation will treat them as boolean values
  return stringifiedYaml
    .replaceAll(': no\n', ': "no"\n')
    .replaceAll(': yes\n', ': "yes"\n')
    .replaceAll(': NO\n', ': "NO"\n')
    .replaceAll(': YES\n', ': "yes"\n')
    .replaceAll(': on\n', ': "on"\n')
    .replaceAll(': ON\n', ': "ON"\n')
    .replaceAll(': off\n', ': "off"\n')
    .replaceAll(': OFF\n', ': "OFF"\n');
};
