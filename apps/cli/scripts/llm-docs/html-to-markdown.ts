import { decodeHTML } from 'entities';

export const htmlToMarkdownText = (value = ''): string =>
  decodeHTML(
    value
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<\/p>\s*<p>/g, '\n\n')
      .replace(/<\/?p>/g, '')
      .replace(/<code>([\s\S]*?)<\/code>/g, '`$1`')
      .replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**')
      .replace(/<em>([\s\S]*?)<\/em>/g, '*$1*')
      .replace(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/^[ \t]+$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
