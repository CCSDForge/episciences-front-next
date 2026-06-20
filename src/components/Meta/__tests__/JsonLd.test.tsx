import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import JsonLd from '../JsonLd';

const getScript = (container: HTMLElement) =>
  container.querySelector('script[type="application/ld+json"]');

describe('JsonLd', () => {
  it('renders a script tag with type application/ld+json', () => {
    const data = { '@context': 'https://schema.org' as const, '@type': 'WebPage' };
    const { container } = render(<JsonLd data={data} />);
    expect(getScript(container)).toBeInTheDocument();
  });

  it('serializes data so JSON.parse recovers the original object', () => {
    const data = {
      '@context': 'https://schema.org' as const,
      '@type': 'WebPage',
      name: 'Test Page',
    };
    const { container } = render(<JsonLd data={data} />);
    const script = getScript(container);
    const parsed = JSON.parse(script?.innerHTML ?? '');
    expect(parsed).toEqual(data);
  });

  it('escapes < to prevent </script> injection', () => {
    const data = {
      '@context': 'https://schema.org' as const,
      '@type': 'WebPage',
      name: '</script><script>alert("xss")</script>',
    };
    const { container } = render(<JsonLd data={data} />);
    const script = getScript(container);
    expect(script?.innerHTML).not.toContain('</script>');
    expect(script?.innerHTML).toContain('\\u003c');
  });

  it('escapes > to \\u003e', () => {
    const data = { '@context': 'https://schema.org' as const, '@type': 'WebPage', name: 'a>b' };
    const { container } = render(<JsonLd data={data} />);
    const script = getScript(container);
    expect(script?.innerHTML).toContain('\\u003e');
    expect(script?.innerHTML).not.toContain('"a>b"');
  });

  it('escapes & to \\u0026', () => {
    const data = { '@context': 'https://schema.org' as const, '@type': 'WebPage', name: 'A&B' };
    const { container } = render(<JsonLd data={data} />);
    const script = getScript(container);
    expect(script?.innerHTML).toContain('\\u0026');
    expect(script?.innerHTML).not.toContain('"A&B"');
  });

  it('parsed output recovers original values despite escaping', () => {
    const data = {
      '@context': 'https://schema.org' as const,
      '@type': 'WebPage',
      name: '<Test & "Page">',
    };
    const { container } = render(<JsonLd data={data} />);
    const script = getScript(container);
    const parsed = JSON.parse(script?.innerHTML ?? '');
    expect(parsed.name).toBe('<Test & "Page">');
  });

  it('renders @graph arrays correctly', () => {
    const data = {
      '@context': 'https://schema.org' as const,
      '@graph': [
        { '@type': 'WebSite', name: 'My Journal' },
        { '@type': 'Periodical', name: 'My Journal' },
      ],
    };
    const { container } = render(<JsonLd data={data} />);
    const script = getScript(container);
    const parsed = JSON.parse(script?.innerHTML ?? '');
    expect(parsed['@graph']).toHaveLength(2);
    expect(parsed['@graph'][0]['@type']).toBe('WebSite');
  });
});
