// @note taken from https://github.com/rafeca/prettyjson

function indent(numSpaces: number): string {
  return ' '.repeat(numSpaces + 1);
}

function getMaxIndexLength(input) {
  let maxWidth = 0;

  Object.getOwnPropertyNames(input).forEach((key) => {
    // Skip undefined values.
    if (input[key] === undefined) {
      return;
    }

    maxWidth = Math.max(maxWidth, key.length);
  });
  return maxWidth;
}

// Helper function to detect if an object can be directly serializable
function isSerializable(input, onlyPrimitives, options) {
  if (
    typeof input === 'boolean' ||
    typeof input === 'number' ||
    typeof input === 'function' ||
    input === null ||
    input instanceof Date
  ) {
    return true;
  }
  if (typeof input === 'string' && !input.includes('\n')) {
    return true;
  }

  if (options.inlineArrays && !onlyPrimitives) {
    if (Array.isArray(input) && isSerializable(input[0], true, options)) {
      return true;
    }
  }

  return false;
}

const addColorToData = function (input, options) {
  if (options.noColor) {
    return input;
  }

  if (typeof input === 'string') {
    // Print strings in regular terminal color
    return input;
  }

  const sInput = `${input}`;
  if (typeof input === 'function') {
    return 'function() {}';
  }

  if (Array.isArray(input)) {
    return input.join(', ');
  }

  return sInput;
};

const indentLines = function (string, spaces) {
  let lines = string.split('\n');
  lines = lines.map((line) => {
    return indent(spaces) + line;
  });
  return lines.join('\n');
};

function renderToArray(data, options, indentation) {
  if (isSerializable(data, false, options)) {
    return [indent(indentation) + addColorToData(data, options)];
  }

  // Unserializable string means it's multiline
  if (typeof data === 'string') {
    return [
      `${indent(indentation)}"""`,
      indentLines(data, indentation + options.defaultIndentation),
      `${indent(indentation)}"""`
    ];
  }

  if (Array.isArray(data)) {
    // If the array is empty, render the `emptyArrayMsg`
    if (data.length === 0) {
      return [indent(indentation) + options.emptyArrayMsg];
    }

    const outputArray = [];

    data.forEach((element) => {
      // Prepend the dash at the beginning of each array's element line
      let line = '- ';
      line = indent(indentation) + line;

      // If the element of the array is a string, bool, number, or null
      // render it in the same line
      if (isSerializable(element, false, options)) {
        line += renderToArray(element, options, 0)[0];
        outputArray.push(line);

        // If the element is an array or object, render it in next line
      } else {
        outputArray.push(line);
        // eslint-disable-next-line prefer-spread
        outputArray.push.apply(outputArray, renderToArray(element, options, indentation + options.defaultIndentation));
      }
    });

    return outputArray;
  }

  if (data instanceof Error) {
    return renderToArray(
      {
        message: data.message,
        stack: data.stack.split('\n')
      },
      options,
      indentation
    );
  }

  // If values alignment is enabled, get the size of the longest index
  // to align all the values
  const maxIndexLength = options.noAlign ? 0 : getMaxIndexLength(data);
  let key;
  const output = [];

  Object.getOwnPropertyNames(data).forEach((i) => {
    // Prepend the index at the beginning of the line
    key = `${i}: `;
    key = indent(indentation) + key;

    // Skip `undefined`, it's not a valid JSON value.
    if (data[i] === undefined) {
      return;
    }

    // If the value is serializable, render it in the same line
    if (isSerializable(data[i], false, options)) {
      const nextIndentation = options.noAlign ? 0 : maxIndexLength - i.length;
      key += renderToArray(data[i], options, nextIndentation)[0];
      output.push(key);

      // If the index is an array or object, render it in next line
    } else {
      output.push(key);
      // eslint-disable-next-line prefer-spread
      output.push.apply(output, renderToArray(data[i], options, indentation + options.defaultIndentation));
    }
  });
  return output;
}

// ### Render function
// *Parameters:*
//
// * **`data`**: Data to render
// * **`options`**: Hash with different options to configure the parser
// * **`indentation`**: Base indentation of the parsed output
//
// *Example of options hash:*
//
//     {
//       emptyArrayMsg: '(empty)', // Rendered message on empty strings
//       keysColor: 'blue',        // Color for keys in hashes
//       dashColor: 'red',         // Color for the dashes in arrays
//       stringColor: 'grey',      // Color for strings
//       defaultIndentation: 2     // Indentation on nested objects
//     }
export function renderPrettyJson(data: Record<string, unknown>): string {
  // Default values
  const indentation = 0;
  const options: any = {};
  options.emptyArrayMsg = options.emptyArrayMsg || '(empty array)';
  options.keysColor = options.keysColor || 'green';
  options.dashColor = options.dashColor || 'green';
  options.numberColor = options.numberColor || 'blue';
  options.defaultIndentation = options.defaultIndentation || 2;
  options.noColor = !!options.noColor;
  options.noAlign = !!options.noAlign;

  options.stringColor = options.stringColor || null;

  return renderToArray(data, options, indentation).join('\n');
}
