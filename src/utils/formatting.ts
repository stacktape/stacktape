import { printer } from './printer';

export const getPrettyTime = (durationInMillis: number) => {
  const formatTime = (num, prefix) => `${num} ${prefix}`;
  const seconds = +(durationInMillis / 1000).toFixed(2);
  const minutes = +(durationInMillis / (1000 * 60)).toFixed(2);
  const hours = +(durationInMillis / (1000 * 60 * 60)).toFixed(2);
  const days = +(durationInMillis / (1000 * 60 * 60 * 24)).toFixed(2);
  let timeFormatted: string | null = null;
  if (seconds < 60) {
    timeFormatted = formatTime(seconds, 'sec');
  } else if (minutes < 60) {
    timeFormatted = formatTime(minutes, 'min');
  } else if (hours < 24) {
    timeFormatted = formatTime(hours, 'hrs');
  } else {
    timeFormatted = formatTime(days, 'days');
  }

  return timeFormatted;
};

export const getPrettyPrintedFlatObject = (obj: Record<string, string | number | boolean>) => {
  return Object.entries(obj)
    .map(([name, val]) => ` ○ ${printer.makeBold(name)}: ${val}`)
    .join('\n');
};

export const normalizePathForLink = (path: string) => {
  if (path === '*') {
    return '/*';
  }
  return path;
};
