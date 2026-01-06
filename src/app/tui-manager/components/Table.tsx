import { Box, Text } from 'ink';
import React from 'react';

type TableProps = {
  header: string[];
  rows: string[][];
  /** Optional column alignments ('left' | 'right' | 'center'). Defaults to 'left' for all columns. */
  alignments?: ('left' | 'right' | 'center')[];
};

/**
 * Calculate column widths based on content
 */
const getColumnWidths = (header: string[], rows: string[][]): number[] => {
  const widths = header.map((h) => stripAnsi(h).length);

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cellLength = stripAnsi(row[i] || '').length;
      if (cellLength > (widths[i] || 0)) {
        widths[i] = cellLength;
      }
    }
  }

  return widths;
};

/**
 * Strip ANSI escape codes for accurate length calculation
 */
const stripAnsi = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
};

/**
 * Pad a string to a given width, respecting ANSI codes
 */
const padCell = (content: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string => {
  const visibleLength = stripAnsi(content).length;
  const padding = width - visibleLength;

  if (padding <= 0) return content;

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + content;
    case 'center': {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
    }
    default:
      return content + ' '.repeat(padding);
  }
};

export const Table: React.FC<TableProps> = ({ header, rows, alignments = [] }) => {
  const columnWidths = getColumnWidths(header, rows);
  const columnCount = header.length;

  // Build border strings
  const horizontalBorder = '─';
  const topLeft = '┌';
  const topRight = '┐';
  const bottomLeft = '└';
  const bottomRight = '┘';
  const headerSepLeft = '├';
  const headerSepRight = '┤';
  const verticalBorder = '│';
  const cross = '┼';
  const topT = '┬';
  const bottomT = '┴';

  const topBorder = topLeft + columnWidths.map((w) => horizontalBorder.repeat(w + 2)).join(topT) + topRight;
  const headerSeparator =
    headerSepLeft + columnWidths.map((w) => horizontalBorder.repeat(w + 2)).join(cross) + headerSepRight;
  const bottomBorder = bottomLeft + columnWidths.map((w) => horizontalBorder.repeat(w + 2)).join(bottomT) + bottomRight;

  const renderRow = (cells: string[], isBold: boolean = false) => {
    const paddedCells = cells.map((cell, i) => {
      const align = alignments[i] || 'left';
      return padCell(cell || '', columnWidths[i], align);
    });

    return (
      <Box>
        <Text>{verticalBorder} </Text>
        {paddedCells.map((cell, i) => (
          <React.Fragment key={i}>
            <Text bold={isBold}>{cell}</Text>
            <Text>
              {' '}
              {verticalBorder}
              {i < columnCount - 1 ? ' ' : ''}
            </Text>
          </React.Fragment>
        ))}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Text>{topBorder}</Text>
      {renderRow(header, true)}
      <Text>{headerSeparator}</Text>
      {rows.map((row, index) => (
        <React.Fragment key={index}>{renderRow(row)}</React.Fragment>
      ))}
      <Text>{bottomBorder}</Text>
    </Box>
  );
};
