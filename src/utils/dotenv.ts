const NEWLINE = '\n';
// eslint-disable-next-line regexp/no-super-linear-backtracking
const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)\s*$/;
const RE_NEWLINES = /\\n/g;
// eslint-disable-next-line regexp/no-dupe-disjunctions
const NEWLINES_MATCH = /\n|\r|\r\n/;

// Parses src into an Object
export const parseDotenv = (fileContent: string): Record<string, unknown> => {
  const result = {};

  fileContent.split(NEWLINES_MATCH).forEach((line) => {
    // matching "KEY' and 'VAL' in 'KEY=VAL'
    const keyValueArr = RE_INI_KEY_VAL.exec(line);
    // matched?
    if (keyValueArr != null) {
      const key = keyValueArr[1];
      // default undefined or missing values to empty string
      let val = keyValueArr[2] || '';
      const end = val.length - 1;
      const isDoubleQuoted = val.startsWith('"') && val[end] === '"';
      const isSingleQuoted = val.startsWith("'") && val[end] === "'";

      // if single or double quoted, remove quotes
      if (isSingleQuoted || isDoubleQuoted) {
        val = val.substring(1, end);

        // if double quoted, expand newlines
        if (isDoubleQuoted) {
          val = val.replace(RE_NEWLINES, NEWLINE);
        }
      } else {
        // remove surrounding whitespace
        val = val.trim();
      }
      result[key] = val;
    }
  });

  return result;
};
