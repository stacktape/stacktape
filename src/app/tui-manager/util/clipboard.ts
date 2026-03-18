export const copyToClipboard = (text: string) => {
  const base64 = Buffer.from(text).toString('base64');
  process.stdout.write(`\x1B]52;c;${base64}\x07`);
  if (process.platform === 'win32') {
    import('node:child_process').then(({ execFile }) => {
      execFile('powershell', ['-NoProfile', '-Command', 'Set-Clipboard', '-Value', text], { timeout: 3000 }, () => {});
    });
  }
};
