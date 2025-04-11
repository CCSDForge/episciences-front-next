import { API_URL } from '@/config/api'

export async function fetchAboutPage(rvcode: string) {
  const response = await fetch(`${API_URL}/pages?page_code=about&rvcode=${rvcode}`, {
    next: {
      revalidate: false
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch about page')
  }

  // Retourner directement la réponse complète pour traitement ultérieur
  return await response.json()
} 