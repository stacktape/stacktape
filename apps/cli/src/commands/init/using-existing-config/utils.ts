import { parseYaml } from '@utils/yaml';

export const getTypescriptConfig = (yamlConfig: string) => {
  const jsObject = parseYaml(yamlConfig);
  const prettyJsObjectString = JSON.stringify(jsObject, null, 2)
    .split('\n')
    .slice(1, -1)
    .map((line) => `${' '.repeat(2)}${line}`)
    .join('\n')
    .replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, (match) => {
      return match.replace(/"/g, '');
    });

  return `import { defineConfig } from 'stacktape';

export default defineConfig(() => {
  return {
${prettyJsObjectString}
  };
});
`;
};
