/** Letters, spaces and apostrophes only, so "Break the ice!" and "break the ice" are the same answer. */
export const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
