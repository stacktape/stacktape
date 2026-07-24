/*
 * Derived from change-case@5.4.4 (https://github.com/blakeembrey/change-case).
 *
 * The MIT License (MIT)
 * Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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
