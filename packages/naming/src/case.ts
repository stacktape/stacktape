const splitLowerUpper = /([\p{Ll}\d])(\p{Lu})/gu;
const splitUpperUpper = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
const stripNonWord = /[^\p{L}\d]+/giu;

const splitWords = (value: string): string[] => {
  let result = value
    .trim()
    .replace(splitLowerUpper, '$1\0$2')
    .replace(splitUpperUpper, '$1\0$2')
    .replace(stripNonWord, '\0');
  let start = 0;
  let end = result.length;
  while (result.charAt(start) === '\0') {
    start += 1;
  }
  if (start === end) {
    return [];
  }
  while (result.charAt(end - 1) === '\0') {
    end -= 1;
  }
  result = result.slice(start, end);
  return result.split('\0');
};

export const pascalCase = (input: string): string =>
  splitWords(input)
    .map((word, index) => {
      const first = word[0] ?? '';
      const initial = index > 0 && first >= '0' && first <= '9' ? `_${first}` : first.toLocaleUpperCase();
      return initial + word.slice(1).toLocaleLowerCase();
    })
    .join('');

export const snakeCase = (input: string): string =>
  splitWords(input)
    .map((word) => word.toLocaleLowerCase())
    .join('_');
