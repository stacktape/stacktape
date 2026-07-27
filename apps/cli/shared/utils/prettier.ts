import { exec } from './exec';

export const prettify = (relativeFolderPath: string) => {
  return exec('bunx', ['prettier', '--write', '--config', '.prettierrc', `./${relativeFolderPath}/**/*`], {
    disableStdout: true
  });
};

export const prettifyFile = ({ filePath }) => {
  return exec('bunx', ['prettier', '--write', '--config', '.prettierrc', filePath], {
    disableStdout: true
  });
};
