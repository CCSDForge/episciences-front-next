import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { repositoryProviders } from '@/services/repositories';

// Guards against the exact failure mode this feature is built to avoid: a repository provider
// added to the registry (services/repositories) without its host also being added to nginx's
// `frame-src` directive, which fails silently in the browser (blocked iframe, no console error
// visible from the app's own code).
const NGINX_TEMPLATES = [
  join(process.cwd(), 'deployment/production/nginx-episciences.conf.template'),
  join(process.cwd(), 'docker/nginx-config/episciences.conf.template'),
];

function extractFrameSrc(cspHeaderValue: string): string[] {
  const match = cspHeaderValue.match(/frame-src\s+([^;]+);/);
  if (!match) return [];
  return match[1].split(/\s+/).filter(Boolean);
}

describe('CSP frame-src covers every registered repository provider', () => {
  for (const templatePath of NGINX_TEMPLATES) {
    it(`includes every provider host in ${templatePath.split('/').slice(-2).join('/')}`, () => {
      const content = readFileSync(templatePath, 'utf-8');
      const frameSrc = extractFrameSrc(content);

      for (const provider of repositoryProviders) {
        for (const host of provider.frameSrc) {
          expect(frameSrc, `provider "${provider.id}" needs "${host}" in frame-src`).toContain(
            host
          );
        }
      }
    });
  }
});
