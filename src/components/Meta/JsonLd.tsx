import type { JSX } from 'react';
import type { SchemaOrgThing } from '@/utils/schema';

interface JsonLdProps {
  data: SchemaOrgThing;
}

export default function JsonLd({ data }: Readonly<JsonLdProps>): JSX.Element {
  const serialized = JSON.stringify(data)
    .replaceAll('<', String.raw`\u003c`)
    .replaceAll('>', String.raw`\u003e`)
    .replaceAll('&', String.raw`\u0026`);

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialized }} />;
}
