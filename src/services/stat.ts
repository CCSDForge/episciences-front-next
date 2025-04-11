import { API_URL } from '@/config/api'

interface FetchStatsParams {
  rvcode: string
  page: number
  itemsPerPage: number
}

export async function fetchStats({ rvcode, page, itemsPerPage }: FetchStatsParams) {
  const params = new URLSearchParams({
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString()
  })

  const response = await fetch(`${API_URL}/journals/${rvcode}/stats?${params}`, {
    next: {
      revalidate: false
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch stats')
  }

  return response.json()
} 