import clsx from 'clsx';

export function Table(props) {
  return (
    <table
      className={clsx(
        'stp-box w-full overflow-hidden p-0 rounded-[8px] mt-[20px] mr-0 mb-[16px] ml-0 [border-spacing:0] [overflow-wrap:normal]',
        '[&_thead]:text-[14px] [&_thead]:text-fc-primary [&_thead]:bg-[rgba(0,0,0,0.2)]',
        '[&_thead_tr]:font-semibold [&_thead_tr]:text-left',
        '[&_thead_tr_th]:m-0 [&_thead_tr_th]:py-[14px] [&_thead_tr_th]:px-[18px] [&_thead_tr_th]:border-b [&_thead_tr_th]:border-b-[rgba(255,255,255,0.08)]',
        '[&_tbody_tr]:m-0 [&_tbody_tr]:p-0 [&_tbody_tr]:transition-[background] [&_tbody_tr]:duration-150 [&_tbody_tr]:ease-[ease]',
        '[&_tbody_tr:hover]:bg-[rgba(255,255,255,0.03)]',
        '[&_tbody_tr:not(:last-child)_td]:border-b [&_tbody_tr:not(:last-child)_td]:border-b-[rgba(255,255,255,0.05)]',
        '[&_tbody_tr_td]:text-[14px] [&_tbody_tr_td]:m-0 [&_tbody_tr_td]:py-[12px] [&_tbody_tr_td]:px-[18px] [&_tbody_tr_td]:text-fc-primary'
      )}
      {...props}
    />
  );
}
