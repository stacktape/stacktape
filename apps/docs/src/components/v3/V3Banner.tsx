import { Link } from '@/components/Mdx/Link';
import { UPGRADE_GUIDE_URL, V3_RELEASE } from '@/utils/v3-archive-routes';

/** Shown above the title of every v3 archive page. */
export function V3Banner({ v4Url }: { v4Url?: string }) {
  return (
    <aside
      aria-label="Version notice"
      className="stp-typography mb-[26px] rounded-[8px] border-l-[4px] border-solid border-l-[rgb(237,139,0)] bg-[rgba(237,139,0,0.12)] px-[18px] py-[14px] text-[0.925rem] leading-[1.6] [&_p]:m-0 [&_p+p]:mt-[8px]"
    >
      <p>
        <strong>This is the documentation for Stacktape v3</strong> ({V3_RELEASE}), which is no longer maintained.{' '}
        {v4Url ? <Link href={v4Url}>Read this page for v4</Link> : <Link href="/">Go to the v4 documentation</Link>} or
        follow the <Link href={UPGRADE_GUIDE_URL}>upgrade guide from v3 to v4</Link>.
      </p>
      <p>
        The install commands on these pages now install v4. To keep using v3, pin the version, for example{' '}
        <code>npm install -g stacktape@{V3_RELEASE}</code>.
      </p>
    </aside>
  );
}
