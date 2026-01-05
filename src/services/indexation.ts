import { API_URL } from '@/config/api'
import { getJournalApiUrl } from '@/utils/env-loader'

export async function fetchIndexationPage(rvcode: string) {
  const apiUrl = getJournalApiUrl(rvcode);
  const response = await fetch(`${apiUrl}/journals/${rvcode}/indexation`, {
    next: {
      revalidate: 86400, // Static content - revalidate once per day (24 hours)
      tags: ['indexation'] // Tag for on-demand revalidation
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch indexation page')
  }

  return response.json()
} 