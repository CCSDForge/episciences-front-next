import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document component for Next.js
 *
 * This file is required for static builds even when using App Router.
 * It provides a minimal structure for the HTML document.
 */
export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}