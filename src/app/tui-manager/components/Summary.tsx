/** @jsxImportSource @opentui/react */
import type { TuiSummary } from '../types';
import React from 'react';

type SummaryProps = {
  summary: TuiSummary;
};

export const Summary: React.FC<SummaryProps> = ({ summary }) => {
  const { success, message, links, consoleUrl } = summary;

  return (
    <box flexDirection="column" marginTop={1}>
      <box flexDirection="row">
        <text fg={success ? 'green' : 'red'}>
          <strong>
            {success ? '+' : 'x'} {message}
          </strong>
        </text>
      </box>
      <text fg="gray">{'-'.repeat(54)}</text>

      {links.map((link, index) => (
        <box key={index} marginLeft={1}>
          <text>
            - <a href={link.url} fg="cyan">
              {link.label}
            </a>{' '}
            {link.url}
          </text>
        </box>
      ))}

      {consoleUrl && (
        <box marginTop={1}>
          <text>
            <a href={consoleUrl} fg="cyan">
              Stack details
            </a>
          </text>
        </box>
      )}

      <text> </text>
    </box>
  );
};
