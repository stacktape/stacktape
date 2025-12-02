import { Footer } from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import { Divider } from '@/components/Mdx/Divider';
import { MobileHamburgerNavigation } from '@/components/Navigation/MobileHamburgerNavigation/MobileHamburgerNavigation';
import { SidebarNavigation } from '@/components/Navigation/SidebarNavigation/Sidebar';
import { TableOfContents } from '@/components/TableOfContents/TableOfContents';
import { onMaxW720, onMaxW795 } from '@/styles/responsive';
import { colors, pageLayout } from '@/styles/variables';
import { useGlobalStore } from '../../global-state';

export default function DocsPageLayout({
  children,
  allDocPages,
  tableOfContents,
  title
}: {
  children: React.ReactNode;
  allDocPages: MdxPageDataForNavigation[];
  tableOfContents: TableOfContentsItem[];
  title: string;
}) {
  const isMobileNavigationOpen = useGlobalStore((store) => store.isMobileNavigationOpen);

  return (
    <>
      <Header />
      <div
        css={{
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          marginTop: pageLayout.headerHeight,
          width: '100%',
          maxWidth: pageLayout.maxPageWidth
        }}
      >
        <MobileHamburgerNavigation isOpen={isMobileNavigationOpen} allDocPages={allDocPages || []} />
        <SidebarNavigation allDocPages={allDocPages || []} showOnSm={false} />
        <main
          id="main-content"
          css={{
            display: isMobileNavigationOpen ? 'none' : 'initial',
            width: '100%',
            padding: '30px 30px 0px 45px',
            [onMaxW720]: {
              padding: '25px 17.5px 0px 20px'
            },
            overflowX: 'hidden'
          }}
        >
          <h1
            css={{
              fontWeight: '500',
              fontSize: '26px',
              color: colors.fontColorPrimary,
              lineHeight: 1.5,
              borderLeft: `4px solid ${colors.stacktapeGreen}`,
              paddingLeft: '15px',
              margin: '0px 0px 25px 2px',
              [onMaxW795]: {
                fontSize: '24px'
              }
            }}
          >
            {title}
          </h1>
          <div
            css={{
              flex: 1,
              code: {
                border: '1px solid rgba(112,112,112, 0.87)',
                borderRadius: '4px',
                padding: '2px 5.5px',
                marginLeft: '3px',
                marginRight: '3px',
                userSelect: 'all'
              },
              section: {
                margin: '2px 0'
              },
              'ul, ol': {
                margin: '18px 0',
                padding: '0 0 0 24px',
                listStyle: 'none',
                [onMaxW795]: {
                  padding: '0 0 0 20px'
                }
              },
              'ul li': {
                position: 'relative',
                margin: '10px 0',
                paddingLeft: '0px',
                lineHeight: '1.8'
              },
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
              // Explicitly prevent bullets on ol li - this must come after ul li
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
              // Ensure ol li never shows bullets - only for ul li
              'ol li': {
                position: 'relative',
                margin: '10px 0',
                paddingLeft: '0px',
                lineHeight: '1.8',
                counterIncrement: 'list-counter'
              },
              ol: {
                counterReset: 'list-counter'
              },
              'ul ul, ol ol, ul ol, ol ul': {
                margin: '6px 0',
                paddingLeft: '24px'
              },
              'ul ul li::before': {
                backgroundColor: colors.fontColorTernary,
                width: '3px',
                height: '3px'
              },
              'ol ol li::before, ul ol li::before': {
                color: `${colors.fontColorTernary} !important`,
                fontSize: '13px !important'
              },
              li: {
                '&:last-child': {
                  marginBottom: '0'
                },
                '&:first-child': {
                  marginTop: '0'
                }
              },
              [onMaxW795]: {
                'ul li::before': {
                  left: '-14px'
                },
                'ol li::before': {
                  left: '-20px'
                }
              }
            }}
          >
            {children}
          </div>
          <Divider style={{ marginTop: '55px' }} />
          <Footer />
        </main>
        <TableOfContents tableOfContents={tableOfContents} />
      </div>
    </>
  );
}
