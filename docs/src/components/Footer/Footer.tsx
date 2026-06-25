import config from '../../../config';

export function Footer() {
  return (
    <footer>
      <div className="flex items-center max-w-[570px] justify-center gap-[40px] mx-auto my-[12px] max-[720px]:my-[10px]">
        <p className="text-center max-[720px]:hidden">{config.metadata.copyright}</p>
        <a href="https://status.stacktape.com" target="_blank" rel="noopener noreferrer">
          <div className="flex items-center gap-[7px]">
            <div className="w-[8px] h-[8px] bg-[#22c55e] rounded-full animate-status-pulse" />
            <p>System status</p>
          </div>
        </a>
        <a href="mailto:info@stacktape.com" target="_blank" rel="noopener noreferrer">
          <p className="text-center">info@stacktape.com</p>
        </a>
      </div>
      <p className="hidden mb-[20px] text-center max-[720px]:block">{config.metadata.copyright}</p>
    </footer>
  );
}
