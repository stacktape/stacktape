import type { DocSearchProps } from '@docsearch/react';
import { DocSearch as DocSearchComponent } from '@docsearch/react';
import { Global } from '@emotion/react';
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
    height: '40px !important',
    backgroundColor: `${colors.inputBackground} !important`,
    border: `1px solid ${colors.borderColor} !important`,
    borderRadius: '4.5px !important',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3) !important',
    margin: '0 !important',
    padding: '0 8px 0 12px !important',
    transition: 'all 0.2s ease !important',
    fontFamily: `${fontFamily} !important`,
    '&:hover': {
      backgroundColor: `${colors.hoverColorDarkGray} !important`,
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4) !important'
    },
    '&:focus': {
      outline: 'none !important',
      boxShadow: `0 0 0 2px ${colors.primary} !important`
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
    backgroundColor: `${colors.darkerBackground} !important`,
    border: `1px solid ${colors.borderColor} !important`,
    borderRadius: '3px !important',
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
    backgroundColor: `${colors.inputBackground} !important`,
    border: `1px solid ${colors.borderColor} !important`,
    borderRadius: '4.5px !important',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3) !important',
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
    backgroundColor: `${colors.elementBackground} !important`,
    // border: `1px solid ${colors.borderColor} !important`,
    borderRadius: '4px !important',
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
