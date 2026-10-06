'use client';

/**
 * Renders a synchronous, blocking inline script (e.g. theme bootstrap) without
 * triggering React's dev-mode warning about <script> tags being rendered by a
 * component. `type` flips between "text/javascript" (server) and "text/plain"
 * (client) so the browser only ever executes the server-rendered copy, during
 * HTML parsing and before hydration — a client re-render must not re-run it.
 * Must be a Client Component: as a Server Component the `typeof window` check would
 * only ever run on the server and the client would receive an executable <script>.
 * See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
export function InlineScript({ html }: { readonly html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
