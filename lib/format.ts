/**
 * Capitalize the first letter of every word in a person's name, preserving the
 * rest of each word as typed (so "McLeod" / "B." stay intact). Trims and
 * collapses internal whitespace. Used at player creation so stored names are
 * clean, which means they always display capitalized across the site.
 */
export function titleCaseName(name: string): string {
  return (name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}
