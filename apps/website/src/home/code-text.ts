/** Splits copy at backticks, which mark code in the section packs, so a layout can set the code parts in mono. */
export const codeParts = (text: string) => text.split('`').map((part, index) => ({ part, code: index % 2 === 1 }));
