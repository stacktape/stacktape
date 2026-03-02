/** @jsxImportSource @opentui/react */

import { useTuiState } from './use-tui-state';

type FooterProps = {
  isCancelling?: boolean;
};

export const Footer = ({ isCancelling }: FooterProps) => {
  const isComplete = useTuiState((s) => s.isComplete);

  if (isComplete) {
    return (
      <box flexDirection="row" height={1} paddingX={1}>
        <text fg="#e5e7eb">
          <b>q</b>
        </text>
        <text fg="#4b5563"> exit</text>
      </box>
    );
  }

  if (isCancelling) {
    return (
      <box flexDirection="row" height={1} paddingX={1}>
        <text fg="#eab308">Rolling back deployment...</text>
      </box>
    );
  }

  return (
    <box flexDirection="row" height={1} paddingX={1}>
      <text fg="#e5e7eb">
        <b>c</b>
      </text>
      <text fg="#4b5563"> cancel & rollback</text>
      <text fg="#374151"> │ </text>
      <text fg="#e5e7eb">
        <b>ctrl+c</b>
      </text>
      <text fg="#4b5563"> force quit</text>
      <box flexGrow={1} />
      <text fg="#e5e7eb">
        <b>↑↓</b>
      </text>
      <text fg="#4b5563"> scroll</text>
    </box>
  );
};
