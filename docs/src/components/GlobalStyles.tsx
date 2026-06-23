import { Global } from '@emotion/react';
import { globalCss } from '@/styles/global';
import { colors } from '@/styles/variables';
import { onMaxW795 } from '@/styles/responsive';

// Prose/structural styles for rendered MDX. In the old app these lived partly in the layout's
// `mdxContentStyles` and partly as per-element css on React heading/paragraph/list components.
// Here they render once, as native-HTML CSS scoped to `.mdx-content`, so the content is static
// HTML with zero per-element runtime styling.
const mdxContentCss: Css = {
  '.mdx-content': {
    flex: 1,
    section: { margin: '2px 0' },

    'ul, ol': {
      margin: '18px 0',
      padding: '0 0 0 24px',
      listStyle: 'none',
      [onMaxW795]: { padding: '0 0 0 20px' }
    },
    'ul li': { position: 'relative', margin: '10px 0', paddingLeft: '0px', lineHeight: '1.8' },
    'ul li::before': {
      content: '""',
      position: 'absolute',
      left: '-16px',
      top: '14px',
      width: '4px',
      height: '4px',
      backgroundColor: colors.lightGray,
      borderRadius: '50%',
      transform: 'translateY(-50%)'
    },
    'ol li::before': {
      content: 'counter(list-counter) "." !important',
      position: 'absolute',
      left: '-24px',
      top: '14px',
      color: colors.lightGray,
      fontSize: '14px',
      fontWeight: '500',
      minWidth: '20px',
      textAlign: 'left',
      transform: 'translateY(-50%)',
      width: 'auto !important',
      height: 'auto !important',
      backgroundColor: 'transparent !important',
      borderRadius: '0 !important'
    },
    'ol li': {
      position: 'relative',
      margin: '10px 0',
      paddingLeft: '0px',
      lineHeight: '1.8',
      counterIncrement: 'list-counter'
    },
    ol: { counterReset: 'list-counter' },
    'ul ul, ol ol, ul ol, ol ul': { margin: '6px 0', paddingLeft: '24px' },
    'ul ul li::before': { backgroundColor: colors.fontColorTernary, width: '3px', height: '3px' },
    'ol ol li::before, ul ol li::before': { color: `${colors.fontColorTernary} !important`, fontSize: '13px !important' },
    li: { '&:last-child': { marginBottom: '0' }, '&:first-child': { marginTop: '0' } },
    [onMaxW795]: { 'ul li::before': { left: '-14px' }, 'ol li::before': { left: '-20px' } },

    'li p': { margin: '8px 0' },
    'li p:first-child': { marginTop: 0 },
    'li p:last-child': { marginBottom: 0 },

    p: { margin: '10px 0px', fontSize: '0.925rem' },

    h1: {
      color: '#0ba29d',
      fontSize: '28px',
      fontWeight: 700,
      lineHeight: '1.4',
      marginBottom: '23px',
      textShadow: `2px 2px ${colors.darkerBackground}`,
      marginTop: '72px',
      [onMaxW795]: { fontSize: '25px', marginTop: '52px' }
    },
    h2: {
      fontSize: '24.5px',
      fontWeight: 700,
      lineHeight: '1.4',
      marginBottom: '20px',
      textShadow: `2px 2px ${colors.darkerBackground}`,
      marginTop: '60px',
      [onMaxW795]: { fontSize: '20px', marginTop: '42px' }
    },
    h3: { fontSize: '20px', fontWeight: 600, lineHeight: '1.4', marginBottom: '20px', marginTop: '40px' },
    h4: { textDecoration: 'underline', fontSize: '16px', fontWeight: 500, lineHeight: '1.4', marginBottom: '10px', marginTop: '17px' },
    // rehype-autolink-headings (behavior: 'wrap') wraps heading text in a self-link.
    'h1 a, h2 a, h3 a, h4 a': { color: 'inherit', textDecoration: 'none' },

    blockquote: {
      marginBottom: '35px',
      marginTop: '-24px',
      p: { color: '#9b9999', textAlign: 'center', fontSize: '14px' }
    },

    // Tabs island: before hydration (and with JS disabled) show only the first/active tab panel.
    // The hydrated Tabs sets inline `display` per panel, which overrides this rule.
    '.stp-tab-panel ~ .stp-tab-panel': { display: 'none' },

    img: { boxShadow: 'none !important', width: '100%', height: 'auto' }
  }
};

export default function GlobalStyles() {
  return (
    <>
      <Global styles={globalCss} />
      <Global styles={mdxContentCss} />
    </>
  );
}
