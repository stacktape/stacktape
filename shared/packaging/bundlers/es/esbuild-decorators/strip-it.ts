/* eslint-disable regexp/strict */
/* eslint-disable no-unmodified-loop-condition */
/* eslint-disable no-cond-assign */
/* eslint-disable regexp/optimal-quantifier-concatenation */
type TextNodeOptions = {
  type?: string;
  value?: string;
  newline?: string;
  match?: boolean;
};

type TextBlockOptions = {
  nodes?: TextBlock[];
} & TextNodeOptions;

class TextNode {
  type: string;
  value: string;
  newline: string;
  match: boolean;

  constructor(node: TextNodeOptions) {
    this.type = node.type;
    this.value = node.value;
    this.match = node.match;
    this.newline = node.newline || '';
  }

  get protected() {
    return Boolean(this.match) && this.match[1] === '!';
  }
}

class TextBlock extends TextNode {
  nodes: Array<TextBlock>;

  constructor(node: TextBlockOptions) {
    super(node);
    this.nodes = node.nodes || [];
  }

  push(node) {
    this.nodes.push(node);
  }

  get protected() {
    return this.nodes.length > 0 && this.nodes[0].protected === true;
  }
}

const constants = {
  ESCAPED_CHAR_REGEX: /^\\./,
  // @ts-expect-error - just ignore
  QUOTED_STRING_REGEX: /^(['"`])((?:\\.|[^\1])+?)(\1)/,
  NEWLINE_REGEX: /^\r*\n/,
  BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
  BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
  LINE_REGEX: /^\/\/(!?).*/
};

const parse = (input: string) => {
  const cst = new TextBlock({ type: 'root', nodes: [] });
  const stack: TextBlock[] = [cst];

  const { ESCAPED_CHAR_REGEX, QUOTED_STRING_REGEX, NEWLINE_REGEX, BLOCK_CLOSE_REGEX, BLOCK_OPEN_REGEX, LINE_REGEX } =
    constants;

  let block = cst;
  let remaining = input;
  let token;
  let prev;

  /**
   * Helpers
   */

  const consume = (value = remaining[0] || '') => {
    remaining = remaining.slice(value.length);
    return value;
  };

  const scan = (regex, type = 'text') => {
    const match = regex.exec(remaining);
    if (match) {
      consume(match[0]);
      return { type, value: match[0], match };
    }
  };

  const push = (node) => {
    if (prev && prev.type === 'text' && node.type === 'text') {
      prev.value += node.value;
      return;
    }
    block.push(node);
    if (node.nodes) {
      stack.push(node);
      block = node;
    }
    prev = node;
  };

  const pop = () => {
    if (block.type === 'root') {
      throw new SyntaxError('Unclosed block comment');
    }
    stack.pop();
    block = stack[stack.length - 1];
  };

  /**
   * Parse input string
   */

  while (remaining !== '') {
    // escaped characters
    if ((token = scan(ESCAPED_CHAR_REGEX, 'text'))) {
      push(new TextNode(token));
      continue;
    }

    // quoted strings
    if (block.type !== 'block' && (!prev || !/\w$/.test(prev.value))) {
      if ((token = scan(QUOTED_STRING_REGEX, 'text'))) {
        push(new TextNode(token));
        continue;
      }
    }

    // newlines
    if ((token = scan(NEWLINE_REGEX, 'newline'))) {
      push(new TextNode(token));
      continue;
    }

    // block comment open
    if ((token = scan(BLOCK_OPEN_REGEX, 'open'))) {
      push(new TextBlock({ type: 'block' }));
      push(new TextNode(token));
      continue;
    }

    // block comment close
    if (block.type === 'block') {
      if ((token = scan(BLOCK_CLOSE_REGEX, 'close'))) {
        token.newline = token.match[1] || '';
        push(new TextNode(token));
        pop();
        continue;
      }
    }

    // line comment
    if (block.type !== 'block') {
      if ((token = scan(LINE_REGEX, 'line'))) {
        push(new TextNode(token));
        continue;
      }
    }

    push(new TextNode({ type: 'text', value: consume(remaining[0]) }));
  }

  return cst;
};

const compile = (cst) => {
  const walk = (node: TextBlock) => {
    let output = '';

    for (const child of node.nodes) {
      switch (child.type) {
        case 'block':
          // Skip block comments entirely
          break;
        case 'line':
          // Skip line comments entirely
          break;
        case 'open':
        case 'close':
          // Skip comment delimiters
          break;
        case 'text':
        case 'newline':
        default: {
          // Add regular text and newlines
          if (child.nodes) {
            // If this child has nested nodes, recursively process them
            output += walk(child as TextBlock);
          } else {
            output += child.value || '';
          }
          break;
        }
      }
    }

    return output;
  };

  return walk(cst);
};

export const strip = (input: string) => compile(parse(input));
