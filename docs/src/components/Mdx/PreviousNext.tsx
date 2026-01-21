import { ChevronLeft, ChevronRight } from 'react-feather';
import { clickableBoxStyle, colors, onMaxW500 } from '@/styles/variables';
import { Link } from './Link';

function LeftButton({ url, title, label }) {
  return (
    <div
      css={{
        ...clickableBoxStyle,
        margin: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        placeSelf: 'stretch',
        color: colors.fontColorPrimary,
        padding: '0px 8px',
        textDecoration: 'none',
        visibility: url ? 'visible' : 'hidden',
        opacity: url ? 1 : 0,
        a: {
          width: '100%',
          display: 'flex',
          alignItems: 'center'
        }
      }}
    >
      <Link href={url || '#'}>
        <div
          css={{
            display: 'flex',
            margin: 0,
            flex: '0 0 auto',
            fontSize: '16pt',
            marginTop: '3px',
            marginRight: '-5px',
            padding: '16px',
            [onMaxW500]: {
              padding: '6px'
            },
            svg: {
              stroke: colors.fontColorPrimary
            }
          }}
        >
          <ChevronLeft color="" />
        </div>
        <div
          css={{
            display: 'block',
            margin: 0,
            flex: '1 1 0%',
            padding: '16px',
            textAlign: 'right',
            [onMaxW500]: {
              padding: '10px'
            }
          }}
        >
          <div
            css={{
              display: 'block',
              margin: 0,
              padding: 0,
              color: colors.fontColorPrimary,
              span: {
                fontSize: '13px',
                lineHeight: 1.625,
                fontWeight: '500'
              }
            }}
          >
            <span>{label}</span>
          </div>
          <div
            css={{
              display: 'block',
              margin: 0,
              padding: 0,
              span: {
                fontSize: '16px',
                lineHeight: 1.5,
                fontWeight: '500'
              }
            }}
          >
            <p css={{ fontWeight: '600' }}>{title}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function RightButton({ url, title, label }) {
  return (
    <div
      css={{
        ...clickableBoxStyle,
        margin: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        placeSelf: 'stretch',
        color: colors.fontColorPrimary,
        padding: '0px 8px',
        textDecoration: 'none',
        visibility: url ? 'visible' : 'hidden',
        opacity: url ? 1 : 0,
        a: {
          width: '100%',
          display: 'flex',
          alignItems: 'center'
        }
      }}
    >
      <Link href={url || '#'}>
        <div
          css={{
            display: 'block',
            margin: 0,
            flex: '1 1 0%',
            padding: '16px',
            [onMaxW500]: {
              padding: '10px'
            }
          }}
        >
          <div
            css={{
              display: 'block',
              margin: 0,
              padding: 0,
              color: colors.fontColorPrimary,
              span: {
                fontSize: '13px',
                lineHeight: 1.625,
                fontWeight: '500'
              }
            }}
          >
            <span>{label}</span>
          </div>
          <div
            css={{
              display: 'block',
              margin: 0,
              padding: 0,
              span: {
                fontSize: '16px',
                lineHeight: 1.5,
                fontWeight: '500'
              }
            }}
          >
            <p css={{ fontWeight: '600' }}>{title}</p>
          </div>
        </div>
        <div
          css={{
            display: 'block',
            margin: 0,
            flex: '0 0 auto',
            fontSize: '16pt',
            marginTop: '3px',
            marginRight: '-5px',
            padding: '16px',
            [onMaxW500]: {
              padding: '6px'
            },
            svg: {
              stroke: colors.fontColorPrimary
            }
          }}
        >
          <ChevronRight color="" />
        </div>
      </Link>
    </div>
  );
}

// const setArrowNavigation = (previous, next) => {
//   useEffect(() => {
//     document.onkeydown = (e) => {
//       e = e || window.event;
//       if (e.keyCode == '37' && previous.url) {
//         // left arrow
//         navigate(previous.url);
//       } else if (e.keyCode == '39' && next.url) {
//         // right arrow
//         navigate(next.url);
//       }
//     };
//   }, [previous, next]);
// };

type ButtonProps = { url?: string; title?: string; label?: string };

// eslint-disable-next-line react/no-unstable-default-props
export function PreviousNext({ left = {}, right = {} }: { left?: ButtonProps; right?: ButtonProps }) {
  return (
    <div
      css={{
        margin: '40px 15px 0px 0px',
        display: 'grid',
        gridTemplateRows: 'auto',
        gridTemplateColumns: '50% 50%',
        gap: '15px'
      }}
    >
      <LeftButton url={left.url} title={left.title} label="Previous" />
      <RightButton url={right.url} title={right.title} label="Next" />
    </div>
  );
}

// export default PreviousNext;
