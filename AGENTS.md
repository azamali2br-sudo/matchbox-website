<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# No fire-and-forget in route handlers

**Always `await` side-effect calls (emails, logging, analytics, etc.) before returning the HTTP response from a Vercel serverless function.** The runtime can freeze the function the moment the response returns, killing any unresolved promises. Pattern `somePromise.then(...)` after the return is silently dropped in production — intermittently — which is the hardest kind of bug to spot.

This is enforced for `app/api/**/*.ts` by `@typescript-eslint/no-floating-promises` in [eslint.config.mjs](eslint.config.mjs). If you have a genuinely background side effect that shouldn't block the response, use Next.js's `after()` from `next/server` (it tells the runtime to keep running until the callback resolves). Never just `.then(...)` and drop the promise.
