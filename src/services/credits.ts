import { API_URL } from '@/config/api'

/**
 * Récupère la page des crédits
 * @returns La page des crédits
 */
export async function fetchCreditsPage(rvcode: string) {
  const response = await fetch(`${API_URL}/pages?page_code=credits&rvcode=${rvcode}`, {
    next: {
      revalidate: false
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch credits page')
  }

  const pages = await response.json()
  return pages.length > 0 ? pages[0] : null
} 