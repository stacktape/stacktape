import type { DocSearchProps } from '@docsearch/react';
import * as docSearchNs from '@docsearch/react';
import { Global } from '@emotion/react';

// @docsearch/react v3 resolves as ESM in the client build but CJS during SSR/prerender. A namespace
// import + fallback chain picks the component in every interop shape (named, cjs-lexer, default).
const DocSearchComponent: typeof import('@docsearch/react').DocSearch =
  (docSearchNs as any).DocSearch ?? (docSearchNs as any).default?.DocSearch ?? (docSearchNs as any).default;
import config from '../../../config';
import { colors, fontFamily, onMaxW750 } from '../../styles/variables';
import '@docsearch/css';

const docSearchCustomStyles = {
  ':root': {
    // Primary colors matching the website's teal theme
    '--docsearch-primary-color': 'rgb(34, 136, 132)', // matches link color from global.ts
    '--docsearch-highlight-color': 'rgb(34, 136, 132)',

    // Text colors matching the website's typography
    '--docsearch-text-color': colors.fontColorPrimary,
    '--docsearch-muted-color': colors.fontColorPrimary,
    '--docsearch-searchbox-focus-background': colors.inputBackground,
    '--docsearch-searchbox-background': colors.inputBackground,
    '--docsearch-searchbox-shadow': `inset 0 0 0 1px ${colors.borderColor}`,

    // Container and modal styling
    '--docsearch-container-background': 'rgba(0, 0, 0, 0.8)',
    '--docsearch-modal-background': colors.backgroundColor,
    '--docsearch-modal-shadow': `0 8px 32px rgba(0, 0, 0, 0.6)`,

    // Hit (search result) colors
    '--docsearch-hit-color': colors.fontColorPrimary,
    '--docsearch-hit-active-color': colors.fontColorPrimary,
    '--docsearch-hit-background': colors.elementBackground,
    '--docsearch-hit-shadow': `0 1px 3px rgba(0, 0, 0, 0.3)`,

    // Footer styling
    '--docsearch-footer-background': colors.darkerBackground,
    '--docsearch-footer-shadow': `0 -1px 0 ${colors.borderColor}`,

    // Key styling
    '--docsearch-key-gradient': `linear-gradient(to bottom, ${colors.elementBackground}, ${colors.darkerBackground})`,
    '--docsearch-key-shadow': `inset 0 -2px 0 0 ${colors.borderColor}, inset 0 0 1px 1px ${colors.borderColor}, 0 2px 2px 0 rgba(0, 0, 0, 0.3)`,

    // Logo color
    '--docsearch-logo-color': colors.fontColorPrimary,

    // Scrollbar colors
    '--docsearch-scrollbar-track': colors.backgroundColor,
    '--docsearch-scrollbar-thumb': colors.fontColorLightGray
  },

  // Global DocSearch styling
  '.DocSearch *': {
    fontFamily: `${fontFamily} !important`
  },

  // Search Button styling
  '.DocSearch-Button': {
    width: '300px !important',
    height: '38px !important',
    background: `${colors.inputBackground} !important`,
    border: 'none !important',
    borderRadius: '8px !important',
    boxShadow:
      'inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.05) !important',
    margin: '0 !important',
    padding: '0 8px 0 12px !important',
    transition: 'background 180ms ease, box-shadow 180ms ease !important',
    fontFamily: `${fontFamily} !important`,
    backdropFilter: 'blur(10px)',
    '&:hover': {
      boxShadow:
        'inset 0 1px 3px rgba(0, 0, 0, 0.31), 0 1px 0 rgba(255, 255, 255, 0.055), 0 0 0 1px rgba(255, 255, 255, 0.08) !important'
    },
    '&:focus': {
      outline: 'none !important',
      boxShadow:
        'inset 0 1px 4px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 3px rgba(110, 116, 116, 0.12) !important'
    },
    [onMaxW750]: {
      width: 'calc(100% - 40px) !important',
      margin: '20px 20px 20px 20px !important'
    }
  },

  // Button container
  '.DocSearch-Button-Container': {
    display: 'flex !important',
    alignItems: 'center !important'
  },

  // Icons
  '.DocSearch-Search-Icon': {
    color: `${colors.fontColorPrimary} !important`,
    width: '16px !important',
    height: '16px !important'
  },
  '.DocSearch-Reset': {
    color: `${colors.fontColorPrimary} !important`,
    '&:hover': {
      color: `${colors.fontColorPrimary} !important`
    }
  },
  '.DocSearch-Close': {
    color: `${colors.fontColorPrimary} !important`,
    '&:hover': {
      color: `${colors.fontColorPrimary} !important`
    }
  },
  '.DocSearch-LoadingIndicator svg': {
    color: `${colors.fontColorPrimary} !important`
  },
  '.DocSearch-MagnifierLabel': {
    color: `${colors.fontColorPrimary} !important`
  },
  '.DocSearch-Label': {
    fontSize: '0.9rem !important'
  },
  // Button text and keys
  '.DocSearch-Button-Placeholder': {
    color: `${colors.fontColorLighterGray} !important`,
    fontSize: '0.9rem !important',
    padding: '0 8px !important'
  },
  '.DocSearch-Button-Keys': {
    display: 'flex !important',
    alignItems: 'center !important',
    gap: '4px !important'
  },
  '.DocSearch-Button-Key': {
    background: `${colors.darkerBackground} !important`,
    border: 'none !important',
    boxShadow:
      'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0, 0, 0, 0.4) !important',
    borderRadius: '5px !important',
    color: `${colors.fontColorLighterGray} !important`,
    fontSize: '0.85rem !important',
    padding: '2px 6px !important',
    minWidth: '20px !important',
    textAlign: 'center' as const
  },

  // Modal styling
  '.DocSearch-Modal': {
    fontFamily: `${fontFamily} !important`
  },
  '.DocSearch-SearchBar': {
    backgroundColor: `${colors.inputBackground} !important`,
    border: `1px solid ${colors.borderColor} !important`,
    borderRadius: '4.5px !important'
  },
  '.DocSearch-Form': {
    background: `${colors.inputBackground} !important`,
    border: 'none !important',
    borderRadius: '8px !important',
    boxShadow:
      'inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.05) !important',
    marginBottom: '12px !important'
  },
  '.DocSearch-Input': {
    backgroundColor: 'transparent !important',
    color: `${colors.fontColorPrimary} !important`,
    fontFamily: `${fontFamily} !important`,
    '&::placeholder': {
      color: `${colors.fontColorLighterGray} !important`
    }
  },

  // Search results
  '.DocSearch-Hit': {
    borderRadius: '4px !important',
    margin: '2px 0 !important',
    '&[aria-selected="true"]': {
      backgroundColor: `${colors.primary} !important`,
      '& .DocSearch-Hit-Container': {
        backgroundColor: 'transparent !important'
      },
      '& .DocSearch-Hit-Title': {
        color: `${colors.fontColorPrimary} !important`
      },
      '& .DocSearch-Hit-Path': {
        color: `${colors.fontColorLighterGray} !important`
      }
    }
  },
  '.DocSearch-Hit-Container': {
    background: `${colors.elementBackground} !important`,
    boxShadow:
      '0 2px 8px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important',
    borderRadius: '7px !important',
    padding: '12px !important'
  },
  '.DocSearch-Hit-Title': {
    color: `${colors.fontColorPrimary} !important`,
    fontFamily: `${fontFamily} !important`,
    fontSize: '0.925rem !important'
  },
  '.DocSearch-Hit-Path': {
    color: `${colors.fontColorLighterGray} !important`,
    fontFamily: `${fontFamily} !important`,
    fontSize: '0.85rem !important'
  },

  // Cancel button and footer
  '.DocSearch-Cancel': {
    color: `${colors.fontColorLighterGray} !important`,
    fontFamily: `${fontFamily} !important`,
    '&:hover': {
      color: `${colors.fontColorPrimary} !important`
    }
  },
  '.DocSearch-Footer': {
    backgroundColor: `${colors.darkerBackground} !important`,
    border: `1px solid ${colors.borderColor} !important`,
    borderRadius: '0 0 4.5px 4.5px !important'
  },
  '.DocSearch-Commands': {
    '& .DocSearch-Commands-Key': {
      backgroundColor: `${colors.elementBackground} !important`,
      border: `1px solid ${colors.borderColor} !important`,
      borderRadius: '3px !important',
      color: `${colors.fontColorLighterGray} !important`
    }
  }
};

export function DocSearch(props: Partial<DocSearchProps>) {
  return (
    <>
      <Global styles={docSearchCustomStyles} />
      <DocSearchComponent
        appId={config.algolia.appId}
        indexName={config.algolia.indexName}
        apiKey={config.algolia.apiKey}
        {...props}
      />
    </>
  );
}
