// Empty mock for 'server-only' package in Vitest (Node.js environment).
// In production Next.js builds, 'server-only' prevents client bundle imports.
// In tests (Node.js / happy-dom), it's a no-op.
export {};
