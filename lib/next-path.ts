// Post-login destination carried through the magic link (?next=…). Relative
// paths only, never an absolute URL someone else controls, so a crafted link
// can't redirect off-site.
const NEXT_RE = /^\/(?!\/)[\w\-/?=&%.]*$/

export function safeNextPath(v: unknown): string | null {
  return typeof v === 'string' && v.length <= 200 && NEXT_RE.test(v) ? v : null
}
