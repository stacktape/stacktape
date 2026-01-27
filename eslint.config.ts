import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import antfu from '@antfu/eslint-config';
import cspellPlugin from '@cspell/eslint-plugin';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default antfu(
  {
    ignores: [
      'node_modules',
      'bin/run',
      'cloudform/*',
      '_example-configs',
      '.stacktape',
      '__stacktape-dist/*',
      '__publish-folder/*',
      '__binary-dist/*',
      'docs/next-env.d.ts',
      '**/*.md'
    ],
    regexp: false,
    lessOpinionated: true,
    formatters: false,
    react: {
      overrides: {
        'react-dom/no-dangerously-set-innerhtml': ['off'],
        'react-hooks-extra/no-direct-set-state-in-use-effect': ['off'],
        'react-refresh/only-export-components': ['off'],
        'react/no-array-index-key': ['off'],
        'react-hooks/set-state-in-effect': ['off']
      }
    },
    yaml: true,
    plugins: {
      '@cspell': cspellPlugin
    },
    rules: {
      '@cspell/spellchecker': [
        'warn',
        {
          configFile: join(__dirname, 'cspell.config.json'),
          checkComments: true,
          checkStringTemplates: true,
          checkStrings: true,
          numSuggestions: 3,
          checkIdentifiers: true,
          autoFix: true
        }
      ],
      'unicorn/prefer-number-properties': 'off',
      'perfectionist/sort-named-imports': 'off',
      'import/consistent-type-specifier-style': 'off',
      'perfectionist/sort-imports': 'off',
      'antfu/consistent-chaining': 'off',
      'eslint-comments/no-unlimited-disable': 'off',
      'node/prefer-global/buffer': 'off',
      'prettier/prettier': ['warn'],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'time', 'clear'] }],
      'ts/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          args: 'after-used'
        }
      ],
      'antfu/consistent-list-newline': 'off',
      'ts/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      'n/prefer-global/process': ['error', 'always'],
      'dot-notation': ['off'],
      'no-case-declarations': ['off']
    },
    typescript: {
      overrides: {
        'ts/no-unused-expressions': ['off'],
        'ts/consistent-type-definitions': ['off'],
        'ts/no-use-before-define': ['off']
      }
    }
  },
  eslintPluginPrettier
);
