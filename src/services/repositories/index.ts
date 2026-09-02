import { IArticleRelatedItem } from '@/types/article';
import { RepositoryPreview, RepositoryProvider } from '@/types/repository-preview';
import { nakalaProvider } from './nakala';

export const repositoryProviders: readonly RepositoryProvider[] = [nakalaProvider];

export function findRepositoryProvider(
  value: string
): { provider: RepositoryProvider; identifier: string } | null {
  for (const provider of repositoryProviders) {
    const identifier = provider.match(value);
    if (identifier) return { provider, identifier };
  }
  return null;
}

/**
 * Resolves repository previews for every related item server-side, so the client never
 * talks to a third-party repository's API directly. Keyed by `${identifierType}-${value}`
 * to match the related-item list rendering key.
 */
export async function resolveRepositoryPreviews(
  relatedItems: readonly IArticleRelatedItem[]
): Promise<Record<string, RepositoryPreview>> {
  if (!relatedItems?.length) return {};

  const entries = await Promise.all(
    relatedItems.map(async relatedItem => {
      const match = findRepositoryProvider(relatedItem.value);
      if (!match) return null;
      const preview = await match.provider.resolve(match.identifier);
      if (!preview.files.length) return null;
      const key = `${relatedItem.identifierType}-${relatedItem.value}`;
      return [key, preview] as const;
    })
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [string, RepositoryPreview] => !!entry)
  );
}
