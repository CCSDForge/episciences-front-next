import type { SchemaOrgThing } from '@/utils/schema';

interface JsonLdProps {
  data: SchemaOrgThing;
}

export default function JsonLd({ data }: JsonLdProps): React.JSX.Element {
  const serialized = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}
