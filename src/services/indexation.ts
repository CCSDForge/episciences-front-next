import { API_URL } from '@/config/api'

export async function fetchIndexationPage(rvcode: string) {
  const response = await fetch(`${API_URL}/journals/${rvcode}/indexation`, {
    next: {
      revalidate: false
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch indexation page')
  }

  return response.json()
} 