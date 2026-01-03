/** @jsxImportSource @opentui/react */
import type { TuiDeploymentHeader } from '../types';
import React from 'react';

type HeaderProps = {
  header: TuiDeploymentHeader;
};

export const Header: React.FC<HeaderProps> = ({ header }) => {
  const { projectName, stageName, region, action } = header;

  return (
    <box flexDirection="column" marginBottom={1}>
      <box
        border
        borderStyle="rounded"
        paddingLeft={1}
        paddingRight={1}
        paddingTop={0}
        paddingBottom={0}
        flexDirection="column"
        width={54}
      >
        <text fg="cyan">
          <strong>{action}</strong>
        </text>
        <text>
          {projectName} <span fg="gray">|</span> {stageName} <span fg="gray">({region})</span>
        </text>
      </box>
    </box>
  );
};
