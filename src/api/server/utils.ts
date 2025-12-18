export const directivesUsableWithDummyCompileTemplate = [
  'CliArgs',
  'Stage',
  'ResourceParam',
  'Var',
  'Region',
  'Format',
  'This',
  'Secret'
];

export const hasDirectivesOtherThan = (input: string, directiveNames: string[]): boolean => {
  // Matches $DirectiveName('arg1', 'arg2', ...)
  // eslint-disable-next-line regexp/no-unused-capturing-group
  const directiveRegex = /\$([a-z_]\w*)\s*\(([^)]*)\)/gi;

  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = directiveRegex.exec(input)) !== null) {
    const directiveName = match[1];

    if (!directiveNames.includes(directiveName)) {
      return true;
    }
  }

  return false;
};

export const replaceDirective = ({
  directiveName,
  yamlString,
  newValue
}: {
  yamlString: string;
  directiveName: string;
  newValue: string;
}) => {
  const regex = new RegExp(`\\$${directiveName}\\(([^)]*)\\)`, 'g');
  return yamlString.replace(regex, newValue);
};

export const getHasUnprocessableDirectives = (input: string): boolean => {
  return hasDirectivesOtherThan(input, directivesUsableWithDummyCompileTemplate);
};
