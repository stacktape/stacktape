import { ChevronLeft, ChevronRight } from 'react-feather';
import clsx from 'clsx';
import { Link } from './Link';

function LeftButton({ url, title, label }) {
  return (
    <div
      className={clsx(
        'stp-clickable-box relative m-0 flex flex-row items-center place-self-stretch px-2 py-0 text-fc-primary no-underline',
        '[&_a]:flex [&_a]:w-full [&_a]:items-center',
        url ? 'visible opacity-100' : 'invisible opacity-0'
      )}
    >
      <Link href={url || '#'}>
        <div className="m-0 mt-[3px] mr-[-5px] flex flex-[0_0_auto] p-4 text-[16pt] max-[500px]:p-[6px] [&_svg]:stroke-fc-primary">
          <ChevronLeft color="" />
        </div>
        <div className="m-0 block flex-[1_1_0%] p-4 text-right max-[500px]:p-[10px]">
          <div className="m-0 block p-0 text-fc-primary [&_p]:text-[13px] [&_p]:font-medium [&_p]:leading-[1.625]">
            <p>{label}</p>
          </div>
          <div className="m-0 block p-0 [&_p]:text-[16px] [&_p]:font-medium [&_p]:leading-[1.5]">
            <p className="font-semibold">{title}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function RightButton({ url, title, label }) {
  return (
    <div
      className={clsx(
        'stp-clickable-box relative m-0 flex flex-row items-center place-self-stretch px-2 py-0 text-fc-primary no-underline',
        '[&_a]:flex [&_a]:w-full [&_a]:items-center',
        url ? 'visible opacity-100' : 'invisible opacity-0'
      )}
    >
      <Link href={url || '#'}>
        <div className="m-0 block flex-[1_1_0%] p-4 max-[500px]:p-[10px]">
          <div className="m-0 block p-0 text-fc-primary [&_p]:text-[13px] [&_p]:font-medium [&_p]:leading-[1.625]">
            <p>{label}</p>
          </div>
          <div className="m-0 block p-0 [&_p]:text-[16px] [&_p]:font-medium [&_p]:leading-[1.5]">
            <p className="font-semibold">{title}</p>
          </div>
        </div>
        <div className="m-0 mt-[3px] mr-[-5px] block flex-[0_0_auto] p-4 text-[16pt] max-[500px]:p-[6px] [&_svg]:stroke-fc-primary">
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
    <div className="mt-[40px] mr-[15px] grid grid-cols-[50%_50%] grid-rows-[auto] gap-[15px]">
      <LeftButton url={left.url} title={left.title} label="Previous" />
      <RightButton url={right.url} title={right.title} label="Next" />
    </div>
  );
}

// export default PreviousNext;
