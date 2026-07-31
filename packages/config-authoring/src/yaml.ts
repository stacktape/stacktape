import yaml from 'yaml';

export const parseYaml = <Value = unknown>(source: string): Value => yaml.parse(source) as Value;

export const stringifyToYaml = (value: unknown, options?: yaml.Options): string => {
  const stringifiedYaml = yaml.stringify(value, options);

  // CloudFormation uses YAML 1.1 and interprets these plain strings as booleans.
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
