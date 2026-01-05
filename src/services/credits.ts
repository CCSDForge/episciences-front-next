import { API_URL } from '@/config/api'
import { getJournalApiUrl } from '@/utils/env-loader'

/**
 * Récupère la page des crédits
 * @returns La page des crédits
 */
export async function fetchCreditsPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(`${apiUrl}/pages?page_code=credits&rvcode=${rvcode}`, {
    next: {
      revalidate: 86400, // Static content - revalidate once per day (24 hours)
      tags: ['credits'] // Tag for on-demand revalidation
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch credits page')
  }

  const pages = await response.json()
  return pages.length > 0 ? pages[0] : null
} 