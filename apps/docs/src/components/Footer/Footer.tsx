import config from '@/site-config';

/** The end of every page: copyright and a few plain links. */
export function Footer() {
  return (
    <footer className="docs-footer">
      <span>{config.metadata.copyright}</span>
      <ul className="docs-footer-links">
        <li>
          <a href="https://status.stacktape.com" target="_blank" rel="noopener noreferrer">
            Status
          </a>
        </li>
        <li>
          <a href="mailto:info@stacktape.com">info@stacktape.com</a>
        </li>
        <li>
          <a href="https://github.com/stacktape/stacktape" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </li>
        <li>
          <a href="https://stacktape.com" target="_blank" rel="noopener noreferrer">
            stacktape.com
          </a>
        </li>
      </ul>
    </footer>
  );
}
